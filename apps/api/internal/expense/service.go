package expense

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) CreateExpense(ctx context.Context, input CreateExpenseInput, recordedBy *uuid.UUID) (*Expense, error) {
	if input.Amount <= 0 {
		return nil, errors.New("nominal pengeluaran harus lebih dari 0")
	}
	if strings.TrimSpace(input.Title) == "" {
		return nil, errors.New("keterangan / perihal pengeluaran wajib diisi")
	}
	if input.ExpenseDate == "" {
		input.ExpenseDate = time.Now().Format("2006-01-02")
	}

	expenseNumber, err := s.repo.GenerateExpenseNumber(ctx, input.ExpenseDate)
	if err != nil {
		return nil, err
	}

	// Auto-flag BHP deductible if category is UPSTREAM_BANDWIDTH or INFRASTRUCTURE_POLE
	// but allow manual override if user explicitly set it
	isBHPDeductible := input.IsBHPDeductible
	if input.Category == CategoryUpstreamBandwidth || input.Category == CategoryInfrastructurePole {
		isBHPDeductible = true
	}

	now := time.Now().UTC()
	exp := &Expense{
		ID:              uuid.New(),
		ExpenseNumber:   expenseNumber,
		Category:        input.Category,
		Title:           strings.TrimSpace(input.Title),
		Amount:          input.Amount,
		ExpenseDate:     input.ExpenseDate,
		VendorName:      input.VendorName,
		PaymentMethod:   input.PaymentMethod,
		BankAccount:     input.BankAccount,
		ReferenceNumber: input.ReferenceNumber,
		IsBHPDeductible: isBHPDeductible,
		Notes:           input.Notes,
		RecordedBy:      recordedBy,
		CreatedAt:       now,
		UpdatedAt:       now,
	}

	if err := s.repo.Create(ctx, exp); err != nil {
		return nil, err
	}

	return s.repo.GetByID(ctx, exp.ID)
}

func (s *Service) GetExpenseByID(ctx context.Context, id uuid.UUID) (*Expense, error) {
	exp, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if exp == nil {
		return nil, errors.New("data pengeluaran tidak ditemukan")
	}
	return exp, nil
}

func (s *Service) UpdateExpense(ctx context.Context, id uuid.UUID, input UpdateExpenseInput) (*Expense, error) {
	exp, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if exp == nil {
		return nil, errors.New("data pengeluaran tidak ditemukan")
	}

	if input.Amount <= 0 {
		return nil, errors.New("nominal pengeluaran harus lebih dari 0")
	}
	if strings.TrimSpace(input.Title) == "" {
		return nil, errors.New("keterangan / perihal pengeluaran wajib diisi")
	}

	exp.Category = input.Category
	exp.Title = strings.TrimSpace(input.Title)
	exp.Amount = input.Amount
	exp.ExpenseDate = input.ExpenseDate
	exp.VendorName = input.VendorName
	exp.PaymentMethod = input.PaymentMethod
	exp.BankAccount = input.BankAccount
	exp.ReferenceNumber = input.ReferenceNumber
	exp.IsBHPDeductible = input.IsBHPDeductible
	exp.Notes = input.Notes

	if err := s.repo.Update(ctx, exp); err != nil {
		return nil, err
	}

	return s.repo.GetByID(ctx, id)
}

func (s *Service) DeleteExpense(ctx context.Context, id uuid.UUID) error {
	return s.repo.Delete(ctx, id)
}

func (s *Service) ListExpenses(ctx context.Context, filter ExpenseFilter) ([]Expense, int, error) {
	return s.repo.List(ctx, filter)
}

func (s *Service) GetExpenseSummary(ctx context.Context, year int, month int) (*ExpenseSummary, error) {
	return s.repo.GetSummary(ctx, year, month)
}
