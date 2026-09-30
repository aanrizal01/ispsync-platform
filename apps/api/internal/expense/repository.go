package expense

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func (r *Repository) DB() *pgxpool.Pool {
	return r.db
}

// GenerateExpenseNumber creates EXP-YYYYMM-0001 format
func (r *Repository) GenerateExpenseNumber(ctx context.Context, dateStr string) (string, error) {
	t, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		t = time.Now()
	}
	prefix := fmt.Sprintf("EXP-%s", t.Format("200601"))

	var count int
	q := `SELECT COUNT(*) FROM expenses WHERE expense_number LIKE $1`
	err = r.db.QueryRow(ctx, q, prefix+"-%").Scan(&count)
	if err != nil {
		return "", err
	}

	return fmt.Sprintf("%s-%04d", prefix, count+1), nil
}

func (r *Repository) Create(ctx context.Context, exp *Expense) error {
	const q = `
		INSERT INTO expenses (
			id, expense_number, category, title, amount, expense_date,
			vendor_name, payment_method, bank_account, reference_number,
			is_bhp_deductible, notes, recorded_by, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6,
			$7, $8, $9, $10,
			$11, $12, $13, $14, $15
		)
	`
	_, err := r.db.Exec(ctx, q,
		exp.ID, exp.ExpenseNumber, exp.Category, exp.Title, exp.Amount, exp.ExpenseDate,
		exp.VendorName, exp.PaymentMethod, exp.BankAccount, exp.ReferenceNumber,
		exp.IsBHPDeductible, exp.Notes, exp.RecordedBy, exp.CreatedAt, exp.UpdatedAt,
	)
	return err
}

func (r *Repository) GetByID(ctx context.Context, id uuid.UUID) (*Expense, error) {
	const q = `
		SELECT 
			e.id, e.expense_number, e.category, e.title, e.amount, to_char(e.expense_date, 'YYYY-MM-DD'),
			e.vendor_name, e.payment_method, e.bank_account, e.reference_number,
			e.is_bhp_deductible, e.notes, e.recorded_by, u.full_name as recorded_by_name,
			e.created_at, e.updated_at
		FROM expenses e
		LEFT JOIN users u ON u.id = e.recorded_by
		WHERE e.id = $1
	`
	var exp Expense
	err := r.db.QueryRow(ctx, q, id).Scan(
		&exp.ID, &exp.ExpenseNumber, &exp.Category, &exp.Title, &exp.Amount, &exp.ExpenseDate,
		&exp.VendorName, &exp.PaymentMethod, &exp.BankAccount, &exp.ReferenceNumber,
		&exp.IsBHPDeductible, &exp.Notes, &exp.RecordedBy, &exp.RecordedByName,
		&exp.CreatedAt, &exp.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &exp, nil
}

func (r *Repository) Update(ctx context.Context, exp *Expense) error {
	const q = `
		UPDATE expenses
		SET 
			category = $2,
			title = $3,
			amount = $4,
			expense_date = $5,
			vendor_name = $6,
			payment_method = $7,
			bank_account = $8,
			reference_number = $9,
			is_bhp_deductible = $10,
			notes = $11,
			updated_at = NOW()
		WHERE id = $1
	`
	res, err := r.db.Exec(ctx, q,
		exp.ID, exp.Category, exp.Title, exp.Amount, exp.ExpenseDate,
		exp.VendorName, exp.PaymentMethod, exp.BankAccount, exp.ReferenceNumber,
		exp.IsBHPDeductible, exp.Notes,
	)
	if err != nil {
		return err
	}
	if res.RowsAffected() == 0 {
		return fmt.Errorf("expense not found")
	}
	return nil
}

func (r *Repository) Delete(ctx context.Context, id uuid.UUID) error {
	const q = `DELETE FROM expenses WHERE id = $1`
	res, err := r.db.Exec(ctx, q, id)
	if err != nil {
		return err
	}
	if res.RowsAffected() == 0 {
		return fmt.Errorf("expense not found")
	}
	return nil
}

func (r *Repository) List(ctx context.Context, filter ExpenseFilter) ([]Expense, int, error) {
	var whereConditions []string
	var args []any
	argIdx := 1

	if filter.StartDate != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("e.expense_date >= $%d", argIdx))
		args = append(args, filter.StartDate)
		argIdx++
	}

	if filter.EndDate != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("e.expense_date <= $%d", argIdx))
		args = append(args, filter.EndDate)
		argIdx++
	}

	if filter.Category != nil && *filter.Category != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("e.category = $%d", argIdx))
		args = append(args, string(*filter.Category))
		argIdx++
	}

	if filter.IsBHPDeductible != nil {
		whereConditions = append(whereConditions, fmt.Sprintf("e.is_bhp_deductible = $%d", argIdx))
		args = append(args, *filter.IsBHPDeductible)
		argIdx++
	}

	if filter.Search != "" {
		s := "%" + strings.ToLower(filter.Search) + "%"
		whereConditions = append(whereConditions, fmt.Sprintf(
			"(LOWER(e.expense_number) LIKE $%d OR LOWER(e.title) LIKE $%d OR LOWER(COALESCE(e.vendor_name, '')) LIKE $%d OR LOWER(COALESCE(e.reference_number, '')) LIKE $%d)",
			argIdx, argIdx, argIdx, argIdx,
		))
		args = append(args, s)
		argIdx++
	}

	whereClause := ""
	if len(whereConditions) > 0 {
		whereClause = "WHERE " + strings.Join(whereConditions, " AND ")
	}

	// Count query
	countQuery := fmt.Sprintf(`SELECT COUNT(*) FROM expenses e %s`, whereClause)
	var total int
	err := r.db.QueryRow(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	// Data query
	limit := filter.Limit
	if limit <= 0 {
		limit = 20
	}
	page := filter.Page
	if page <= 0 {
		page = 1
	}
	offset := (page - 1) * limit

	dataQuery := fmt.Sprintf(`
		SELECT 
			e.id, e.expense_number, e.category, e.title, e.amount, to_char(e.expense_date, 'YYYY-MM-DD'),
			e.vendor_name, e.payment_method, e.bank_account, e.reference_number,
			e.is_bhp_deductible, e.notes, e.recorded_by, u.full_name as recorded_by_name,
			e.created_at, e.updated_at
		FROM expenses e
		LEFT JOIN users u ON u.id = e.recorded_by
		%s
		ORDER BY e.expense_date DESC, e.created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argIdx, argIdx+1)

	args = append(args, limit, offset)

	rows, err := r.db.Query(ctx, dataQuery, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var expenses []Expense
	for rows.Next() {
		var exp Expense
		err := rows.Scan(
			&exp.ID, &exp.ExpenseNumber, &exp.Category, &exp.Title, &exp.Amount, &exp.ExpenseDate,
			&exp.VendorName, &exp.PaymentMethod, &exp.BankAccount, &exp.ReferenceNumber,
			&exp.IsBHPDeductible, &exp.Notes, &exp.RecordedBy, &exp.RecordedByName,
			&exp.CreatedAt, &exp.UpdatedAt,
		)
		if err != nil {
			return nil, 0, err
		}
		expenses = append(expenses, exp)
	}

	return expenses, total, nil
}

func (r *Repository) GetSummary(ctx context.Context, year int, month int) (*ExpenseSummary, error) {
	if year <= 0 {
		year = time.Now().Year()
	}
	if month <= 0 {
		month = int(time.Now().Month())
	}

	summary := &ExpenseSummary{
		CategoryBreakdown: make(map[string]int64),
	}

	// 1. Total this month & count
	monthStart := fmt.Sprintf("%04d-%02d-01", year, month)
	var monthEnd string
	if month == 12 {
		monthEnd = fmt.Sprintf("%04d-01-01", year+1)
	} else {
		monthEnd = fmt.Sprintf("%04d-%02d-01", year, month+1)
	}

	qMonth := `
		SELECT COALESCE(SUM(amount), 0), COUNT(*) 
		FROM expenses 
		WHERE expense_date >= $1 AND expense_date < $2
	`
	err := r.db.QueryRow(ctx, qMonth, monthStart, monthEnd).Scan(&summary.TotalExpensesMonth, &summary.CountMonth)
	if err != nil {
		return nil, err
	}

	// 2. Total this year & total BHP deductible this year
	yearStart := fmt.Sprintf("%04d-01-01", year)
	yearEnd := fmt.Sprintf("%04d-01-01", year+1)

	qYear := `
		SELECT 
			COALESCE(SUM(amount), 0),
			COALESCE(SUM(CASE WHEN is_bhp_deductible = true THEN amount ELSE 0 END), 0)
		FROM expenses 
		WHERE expense_date >= $1 AND expense_date < $2
	`
	err = r.db.QueryRow(ctx, qYear, yearStart, yearEnd).Scan(&summary.TotalExpensesYear, &summary.TotalBHPDeductible)
	if err != nil {
		return nil, err
	}

	// 3. Category breakdown this month
	qCat := `
		SELECT category, COALESCE(SUM(amount), 0)
		FROM expenses
		WHERE expense_date >= $1 AND expense_date < $2
		GROUP BY category
		ORDER BY SUM(amount) DESC
	`
	rows, err := r.db.Query(ctx, qCat, monthStart, monthEnd)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var cat string
		var amt int64
		if err := rows.Scan(&cat, &amt); err == nil {
			summary.CategoryBreakdown[cat] = amt
			if summary.TopCategoryMonth == "" {
				summary.TopCategoryMonth = cat
				summary.TopCategoryAmount = amt
			}
		}
	}

	return summary, nil
}
