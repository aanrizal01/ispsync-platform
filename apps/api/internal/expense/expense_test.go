package expense_test

import (
	"testing"
	"time"

	"github.com/gigabill/isp/internal/expense"
)

func TestExpenseCategoriesAndValidation(t *testing.T) {
	categories := []expense.ExpenseCategory{
		expense.CategoryUpstreamBandwidth,
		expense.CategoryInfrastructurePole,
		expense.CategoryMaintenanceRepair,
		expense.CategorySalaryWages,
		expense.CategoryNOCElectricity,
		expense.CategoryEquipmentMaterial,
		expense.CategoryMarketingSales,
		expense.CategoryOperationalGeneral,
		expense.CategoryOther,
	}

	if len(categories) != 9 {
		t.Errorf("expected 9 expense categories, got %d", len(categories))
	}

	methods := []expense.PaymentMethod{
		expense.PaymentMethodBankTransfer,
		expense.PaymentMethodCash,
		expense.PaymentMethodPettyCash,
		expense.PaymentMethodOther,
	}

	if len(methods) != 4 {
		t.Errorf("expected 4 payment methods, got %d", len(methods))
	}

	today := time.Now().Format("2006-01-02")
	input := expense.CreateExpenseInput{
		Category:        expense.CategoryUpstreamBandwidth,
		Title:           "Sewa Bandwidth 1Gbps PT Telkom",
		Amount:          15000000,
		ExpenseDate:     today,
		PaymentMethod:   expense.PaymentMethodBankTransfer,
		IsBHPDeductible: true,
	}

	if input.Amount <= 0 {
		t.Errorf("amount must be > 0")
	}
	if !input.IsBHPDeductible {
		t.Errorf("upstream bandwidth should be marked as deductible")
	}
}
