package customer

import (
	"time"

	"github.com/google/uuid"
)

type Status string

const (
	StatusLead       Status = "LEAD"
	StatusActive     Status = "ACTIVE"
	StatusSuspended  Status = "SUSPENDED"
	StatusTerminated Status = "TERMINATED"
)

type Customer struct {
	ID             uuid.UUID         `json:"id"`
	PartnerID      *uuid.UUID        `json:"partner_id,omitempty"`
	CustomerNumber string            `json:"customer_number"`
	FullName       string            `json:"full_name"`
	Email          *string           `json:"email,omitempty"`
	Phone          string            `json:"phone"`
	Status         Status            `json:"status"`
	Notes          *string           `json:"notes,omitempty"`
	CreatedAt      time.Time         `json:"created_at"`
	UpdatedAt      time.Time         `json:"updated_at"`
	DeletedAt      *time.Time        `json:"deleted_at,omitempty"`
	Addresses      []Address         `json:"addresses,omitempty"`
	Contacts       []Contact         `json:"contacts,omitempty"`
	Devices        []Device          `json:"devices,omitempty"`
}

type AddressType string

const (
	AddressBilling      AddressType = "BILLING"
	AddressInstallation AddressType = "INSTALLATION"
	AddressMailing      AddressType = "MAILING"
)

type Address struct {
	ID          uuid.UUID   `json:"id"`
	CustomerID  uuid.UUID   `json:"customer_id"`
	AddressType AddressType `json:"address_type"`
	Street      string      `json:"street"`
	City        string      `json:"city"`
	District    *string     `json:"district,omitempty"`
	Province    *string     `json:"province,omitempty"`
	PostalCode  *string     `json:"postal_code,omitempty"`
	Country     string      `json:"country"`
	IsPrimary   bool        `json:"is_primary"`
	CreatedAt   time.Time   `json:"created_at"`
	UpdatedAt   time.Time   `json:"updated_at"`
}

type ContactType string

const (
	ContactPhone    ContactType = "PHONE"
	ContactEmail    ContactType = "EMAIL"
	ContactWhatsapp ContactType = "WHATSAPP"
)

type Contact struct {
	ID          uuid.UUID   `json:"id"`
	CustomerID  uuid.UUID   `json:"customer_id"`
	ContactType ContactType `json:"contact_type"`
	Value       string      `json:"value"`
	Label       *string     `json:"label,omitempty"`
	IsPrimary   bool        `json:"is_primary"`
	CreatedAt   time.Time   `json:"created_at"`
	UpdatedAt   time.Time   `json:"updated_at"`
}

type Device struct {
	ID               uuid.UUID  `json:"id"`
	CustomerID       uuid.UUID  `json:"customer_id"`
	AccessAccountID  *uuid.UUID `json:"access_account_id,omitempty"`
	MACAddress       string     `json:"mac_address"`
	DeviceName       *string    `json:"device_name,omitempty"`
	DeviceType       *string    `json:"device_type,omitempty"`
	OSType           *string    `json:"os_type,omitempty"`
	PasspointCapable bool       `json:"passpoint_capable"`
	RegisteredAt     time.Time  `json:"registered_at"`
	LastSeenAt       *time.Time `json:"last_seen_at,omitempty"`
}

// Request / Response DTOs

type CreateCustomerRequest struct {
	PartnerID  *uuid.UUID `json:"partner_id"`
	FullName   string     `json:"full_name" validate:"required,min=2,max=255"`
	Email      *string    `json:"email" validate:"omitempty,email"`
	Phone      string     `json:"phone" validate:"required,min=8,max=50"`
	Notes      *string    `json:"notes"`
	Street     string     `json:"street" validate:"required"`
	City       string     `json:"city" validate:"required"`
	District   *string    `json:"district"`
	Province   *string    `json:"province"`
	PostalCode *string    `json:"postal_code"`
}

type UpdateCustomerRequest struct {
	FullName string  `json:"full_name" validate:"required,min=2,max=255"`
	Email    *string `json:"email" validate:"omitempty,email"`
	Phone    string  `json:"phone" validate:"required,min=8,max=50"`
	Status   Status  `json:"status" validate:"required,oneof=LEAD ACTIVE SUSPENDED TERMINATED"`
	Notes    *string `json:"notes"`
}

type AddAddressRequest struct {
	AddressType AddressType `json:"address_type" validate:"required,oneof=BILLING INSTALLATION MAILING"`
	Street      string      `json:"street" validate:"required"`
	City        string      `json:"city" validate:"required"`
	District    *string     `json:"district"`
	Province    *string     `json:"province"`
	PostalCode  *string     `json:"postal_code"`
	Country     string      `json:"country"`
	IsPrimary   bool        `json:"is_primary"`
}

type RegisterDeviceRequest struct {
	AccessAccountID  *uuid.UUID `json:"access_account_id"`
	MACAddress       string     `json:"mac_address" validate:"required,mac"`
	DeviceName       *string    `json:"device_name"`
	DeviceType       *string    `json:"device_type"`
	OSType           *string    `json:"os_type"`
	PasspointCapable bool       `json:"passpoint_capable"`
}

type CustomerBASTReport struct {
	ID                   string    `json:"id"`
	WorkOrderID          string    `json:"work_order_id"`
	OpticalPowerDBM      float64   `json:"optical_power_dbm"`
	ONTSerialNumber      string    `json:"ont_serial_number"`
	ONTMACAddress        string    `json:"ont_mac_address"`
	DropcoreLengthMeters int       `json:"dropcore_length_meters"`
	CustomerSignatureURL *string   `json:"customer_signature_url,omitempty"`
	ProofPhotoURL        *string   `json:"proof_photo_url,omitempty"`
	HousePhotoURL        *string   `json:"house_photo_url,omitempty"`
	SpeedtestDownMbps    float64   `json:"speedtest_down_mbps"`
	SpeedtestUpMbps      float64   `json:"speedtest_up_mbps"`
	Notes                string    `json:"notes,omitempty"`
	CreatedAt            time.Time `json:"created_at"`
}

type CustomerWorkOrder struct {
	ID             string              `json:"id"`
	OrderNo        string              `json:"order_no"`
	RegistrationID string              `json:"registration_id"`
	Type           string              `json:"type"`
	TechnicianName string              `json:"technician_name"`
	ScheduledAt    time.Time           `json:"scheduled_at"`
	Status         string              `json:"status"`
	Notes          string              `json:"notes,omitempty"`
	CreatedAt      time.Time           `json:"created_at"`
	BAST           *CustomerBASTReport `json:"bast,omitempty"`
}

type CustomerDocumentSite struct {
	RegistrationID       string             `json:"registration_id"`
	RegistrationNo       string             `json:"registration_no"`
	FullName             string             `json:"full_name"`
	IDCardNumber         string             `json:"id_card_number"`
	TaxID                string             `json:"tax_id,omitempty"`
	Phone                string             `json:"phone"`
	Email                string             `json:"email"`
	Address              string             `json:"address"`
	Latitude             float64            `json:"latitude"`
	Longitude            float64            `json:"longitude"`
	SelectedPlanID       string             `json:"selected_plan_id"`
	SelectedPlanName     string             `json:"selected_plan_name"`
	NearestODPCode       *string            `json:"nearest_odp_code,omitempty"`
	DistanceToODPMeters  float64            `json:"distance_to_odp_meters"`
	Status               string             `json:"status"`
	KTPPhotoURL          string             `json:"ktp_photo_url,omitempty"`
	HousePhotoURL        string             `json:"house_photo_url,omitempty"`
	ContractSignatureURL string             `json:"contract_signature_url,omitempty"`
	ContractSignedAt     *time.Time         `json:"contract_signed_at,omitempty"`
	WorkOrder            *CustomerWorkOrder `json:"work_order,omitempty"`
	CreatedAt            time.Time          `json:"created_at"`
}

type CustomerDocumentsResponse struct {
	CustomerID   string                 `json:"customer_id"`
	FullName     string                 `json:"full_name"`
	Phone        string                 `json:"phone"`
	Email        *string                `json:"email,omitempty"`
	IDCardNumber string                 `json:"id_card_number,omitempty"`
	Sites        []CustomerDocumentSite `json:"sites"`
}

