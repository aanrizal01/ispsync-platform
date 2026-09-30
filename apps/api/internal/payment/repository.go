package payment

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/gigabill/isp/internal/shared/pagination"
	"github.com/gigabill/isp/pkg/money"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func (r *Repository) GeneratePaymentNumber(ctx context.Context) (string, error) {
	var seqVal int64
	err := r.db.QueryRow(ctx, "SELECT nextval('payment_number_seq')").Scan(&seqVal)
	if err != nil {
		return "", fmt.Errorf("generate payment number: %w", err)
	}
	now := time.Now()
	return fmt.Sprintf("PAY-%d-%02d-%05d", now.Year(), int(now.Month()), seqVal), nil
}

func (r *Repository) IsIdempotencyProcessed(ctx context.Context, key string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM payments WHERE idempotency_key = $1)", key).Scan(&exists)
	return exists, err
}

func (r *Repository) ProcessPaymentWithAllocation(ctx context.Context, p *Payment, alloc *Allocation) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	var gwRespJSON []byte
	if p.GatewayResponse != nil {
		gwRespJSON, _ = json.Marshal(p.GatewayResponse)
	}

	const insertPayment = `
		INSERT INTO payments (
			id, payment_number, customer_id, invoice_id, payment_method,
			external_id, status, amount, currency, paid_at, notes,
			receipt_url, gateway_response, idempotency_key, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
	`
	_, err = tx.Exec(ctx, insertPayment,
		p.ID, p.PaymentNumber, p.CustomerID, p.InvoiceID, p.PaymentMethod,
		p.ExternalID, p.Status, p.Amount.Int64(), p.Currency, p.PaidAt, p.Notes,
		p.ReceiptURL, gwRespJSON, p.IdempotencyKey, p.CreatedAt, p.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("insert payment: %w", err)
	}

	if alloc != nil {
		const insertAlloc = `
			INSERT INTO payment_allocations (id, payment_id, invoice_id, amount, allocated_at)
			VALUES ($1, $2, $3, $4, $5)
		`
		_, err = tx.Exec(ctx, insertAlloc,
			alloc.ID, p.ID, alloc.InvoiceID, alloc.Amount.Int64(), alloc.AllocatedAt,
		)
		if err != nil {
			return fmt.Errorf("insert payment allocation: %w", err)
		}

		// Update invoice balance
		const updateInvoice = `
			UPDATE invoices
			SET amount_paid = amount_paid + $1,
			    amount_due = GREATEST(0, amount_due - $1),
			    status = CASE 
			        WHEN (amount_due - $1) <= 0 THEN 'PAID'
			        ELSE 'PARTIALLY_PAID'
			    END,
			    updated_at = NOW()
			WHERE id = $2
		`
		_, err = tx.Exec(ctx, updateInvoice, alloc.Amount.Int64(), alloc.InvoiceID)
		if err != nil {
			return fmt.Errorf("update invoice paid amount: %w", err)
		}
	}

	return tx.Commit(ctx)
}

func (r *Repository) GetByID(ctx context.Context, id uuid.UUID) (*Payment, error) {
	const q = `
		SELECT p.id, p.payment_number, p.customer_id, c.customer_number, c.full_name,
		       p.invoice_id, i.invoice_number, p.payment_method, p.external_id,
		       p.status, p.amount, p.currency, p.paid_at, p.notes, p.receipt_url,
		       p.gateway_response, p.idempotency_key, p.created_at, p.updated_at
		FROM payments p
		JOIN customers c ON c.id = p.customer_id
		LEFT JOIN invoices i ON i.id = p.invoice_id
		WHERE p.id = $1
	`
	var p Payment
	var amount int64
	var gwJSON []byte

	err := r.db.QueryRow(ctx, q, id).Scan(
		&p.ID, &p.PaymentNumber, &p.CustomerID, &p.CustomerNumber, &p.CustomerName,
		&p.InvoiceID, &p.InvoiceNumber, &p.PaymentMethod, &p.ExternalID,
		&p.Status, &amount, &p.Currency, &p.PaidAt, &p.Notes, &p.ReceiptURL,
		&gwJSON, &p.IdempotencyKey, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get payment by id: %w", err)
	}

	p.Amount = money.Amount(amount)
	if len(gwJSON) > 0 {
		_ = json.Unmarshal(gwJSON, &p.GatewayResponse)
	}
	return &p, nil
}

func (r *Repository) List(ctx context.Context, params pagination.Params, customerID *uuid.UUID, status string) ([]Payment, int, error) {
	where := "WHERE 1=1"
	args := []interface{}{}
	argIdx := 1

	if customerID != nil {
		where += fmt.Sprintf(" AND p.customer_id = $%d", argIdx)
		args = append(args, *customerID)
		argIdx++
	}

	if status != "" {
		where += fmt.Sprintf(" AND p.status = $%d", argIdx)
		args = append(args, status)
		argIdx++
	}

	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM payments p %s", where)
	var total int
	err := r.db.QueryRow(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	orderBy := "ORDER BY p.created_at DESC"
	if params.Sort != "" {
		orderBy = fmt.Sprintf("ORDER BY p.%s %s", params.Sort, params.Order)
	}

	dataQuery := fmt.Sprintf(`
		SELECT p.id, p.payment_number, p.customer_id, c.customer_number, c.full_name,
		       p.invoice_id, i.invoice_number, p.payment_method, p.external_id,
		       p.status, p.amount, p.currency, p.paid_at, p.notes, p.receipt_url,
		       p.gateway_response, p.idempotency_key, p.created_at, p.updated_at
		FROM payments p
		JOIN customers c ON c.id = p.customer_id
		LEFT JOIN invoices i ON i.id = p.invoice_id
		%s
		%s
		LIMIT $%d OFFSET $%d
	`, where, orderBy, argIdx, argIdx+1)

	args = append(args, params.Limit, params.Offset)

	rows, err := r.db.Query(ctx, dataQuery, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var payments []Payment
	for rows.Next() {
		var p Payment
		var amount int64
		var gwJSON []byte

		err := rows.Scan(
			&p.ID, &p.PaymentNumber, &p.CustomerID, &p.CustomerNumber, &p.CustomerName,
			&p.InvoiceID, &p.InvoiceNumber, &p.PaymentMethod, &p.ExternalID,
			&p.Status, &amount, &p.Currency, &p.PaidAt, &p.Notes, &p.ReceiptURL,
			&gwJSON, &p.IdempotencyKey, &p.CreatedAt, &p.UpdatedAt,
		)
		if err != nil {
			return nil, 0, err
		}

		p.Amount = money.Amount(amount)
		if len(gwJSON) > 0 {
			_ = json.Unmarshal(gwJSON, &p.GatewayResponse)
		}
		payments = append(payments, p)
	}

	return payments, total, nil
}
