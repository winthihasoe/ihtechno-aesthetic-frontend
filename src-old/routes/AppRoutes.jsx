import { Routes, Route, Navigate, useParams } from "react-router-dom";
import { useLocation } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import AdminLayout from "../components/layout/AdminLayout";
import ReceptionLayout from "../components/layout/ReceptionLayout";
import DoctorLayout from "../components/layout/DoctorLayout";
import TherapistLayout from "../components/layout/TherapistLayout";
import CashierLayout from "../components/layout/CashierLayout";
import OwnerLayout from "../components/layout/OwnerLayout";
import LoginPage from "../pages/auth/LoginPage";
import DashboardPage from "../pages/DashboardPage";
import LiveBoardPage from "../pages/LiveBoardPage";
import TreatmentRoomPage from "../pages/TreatmentRoomPage";
import ConsultationRoomPage from "../pages/ConsultationRoomPage";
import PreparationRoomPage from "../pages/PreparationRoomPage";
import CreatePatientPage from "../pages/patients/CreatePatientPage";
import PatientsPage from "../pages/patients/PatientsPage";
import PatientDetailPage from "../pages/patients/PatientDetailPage";
import AppointmentsPage from "../pages/AppointmentsPage";
import PaymentsPage from "../pages/PaymentsPage";
import PaymentDetailPage from "../pages/PaymentDetailPage";
import CommissionsPage from "../pages/CommissionsPage";
import UsersPage from "../pages/UsersPage";
import StaffProfilesListPage from "../pages/hr/StaffProfilesListPage";
import StaffProfileDetailsPage from "../pages/hr/StaffProfileDetailsPage";
import StaffProfileCreatePage from "../pages/hr/StaffProfileCreatePage";
import OrganizationStructurePage from "../pages/hr/OrganizationStructurePage";
import HrAttendancePage from "../pages/hr/HrAttendancePage";
import HrLeavesPage from "../pages/hr/HrLeavesPage";
import HrLeaveRulesPage from "../pages/hr/HrLeaveRulesPage";
import HrOvertimePage from "../pages/hr/HrOvertimePage";
import HrLateAttendancePolicyPage from "../pages/hr/HrLateAttendancePolicyPage";
import HrAssignmentsPage from "../pages/hr/HrAssignmentsPage";
import HrPayrollPage from "../pages/hr/HrPayrollPage";
import HrCompensationPage from "../pages/hr/HrCompensationPage";
import HrSalaryPage from "../pages/hr/HrSalaryPage";
import HrVariablePayPage from "../pages/hr/HrVariablePayPage";
import HrAllowancesPage from "../pages/hr/HrAllowancesPage";
import HrDeductionsPage from "../pages/hr/HrDeductionsPage";
import HrSalaryHoldRegisterPage from "../pages/hr/HrSalaryHoldRegisterPage";
import HrGrievancePage from "../pages/hr/HrGrievancePage";
import HrReportsPage from "../pages/hr/HrReportsPage";
import HrPublicHolidaysPage from "../pages/hr/HrPublicHolidaysPage";
import MyDailyRecordPage from "../pages/hr/MyDailyRecordPage";
import MyLeaveRequestPage from "../pages/hr/MyLeaveRequestPage";
import MyGrievancePage from "../pages/hr/MyGrievancePage";
import MyPayslipPage from "../pages/hr/MyPayslipPage";
import MyJobDescriptionPage from "../pages/hr/MyJobDescriptionPage";
import JobPositionsPage from "../pages/hr/JobPositionsPage";
import SettingsPage from "../pages/SettingsPage";
import LiveBoardRulesPage from "../pages/LiveBoardRulesPage";
import FinanceReportsPage from "../pages/finance/FinanceReportsPage";
import SupplierPayablesPage from "../pages/finance/SupplierPayablesPage";
import SupplierPayableDetailPage from "../pages/finance/SupplierPayableDetailPage";
import FinanceFixedAssetsPage from "../pages/finance/FinanceFixedAssetsPage";
import FinancePrepaidExpensesPage from "../pages/finance/FinancePrepaidExpensesPage";
import FinanceFixedAssetsImportPage from "../pages/finance/FinanceFixedAssetsImportPage";
import FinanceExpensesPage from "../pages/finance/FinanceExpensesPage";
import FinanceChartOfAccountsPage from "../pages/finance/FinanceChartOfAccountsPage";
import FinanceTransactionMethodsPage from "../pages/finance/FinanceTransactionMethodsPage";
import FinancePayrollStatementInputsPage from "../pages/finance/FinancePayrollStatementInputsPage";
import OtherIncomePage from "../pages/finance/OtherIncomePage";
import JournalEntriesPage from "../pages/finance/JournalEntriesPage";
import TransactionPage from "../pages/finance/TransactionPage";
import GeneralLedgerPage from "../pages/finance/GeneralLedgerPage";
import AccountingGuidePage from "../pages/finance/AccountingGuidePage";
import ProfitLossPage from "../pages/finance/ProfitLossPage";
import BalanceSheetPage from "../pages/finance/BalanceSheetPage";
import CashMovementsPage from "../pages/finance/CashMovementsPage";
import AccountantLayout from "../components/layout/AccountantLayout";
import EmrAuditLogsPage from "../pages/reports/EmrAuditLogsPage";
import AppointmentsReportPage from "../pages/reports/AppointmentsReportPage";
import TreatmentMarginsPage from "../pages/reports/TreatmentMarginsPage";
import FormsPage from "../pages/FormsPage";
import FormBuilderPage from "../pages/FormBuilderPage";
import FormDetailsPage from "../pages/FormDetailsPage";
import InventoryPage from "../pages/inventory/InventoryPage";
import TreatmentTemplatesPage from "../pages/inventory/TreatmentTemplatesPage";
import TreatmentTemplateEditorPage from "../pages/inventory/TreatmentTemplateEditorPage";
import ProductDetailPage from "../pages/inventory/ProductDetailPage";
import PurchasesPage from "../pages/inventory/PurchasesPage";
import PurchaseDetailPage from "../pages/inventory/PurchaseDetailPage";
import SuppliersPage from "../pages/inventory/SuppliersPage";
import StockMovementsPage from "../pages/inventory/StockMovementsPage";
import SupplierReturnsPage from "../pages/inventory/SupplierReturnsPage";
import BatchRecallsPage from "../pages/inventory/BatchRecallsPage";
import EquipmentConsumablesPage from "../pages/inventory/EquipmentConsumablesPage";
import ConsignmentReportPage from "../pages/inventory/ConsignmentReportPage";
import ConsignmentSettlementPage from "../pages/inventory/ConsignmentSettlementPage";
import RolesPermissionsPage from "../pages/RolesPermissionsPage";
import PackagesPage from "../pages/packages/PackagesPage";
import CustomerPackageListPage from "../pages/packages/CustomerPackageListPage";
import FollowUpCenterPage from "../pages/FollowUpCenterPage";
import TreatmentApprovalsPage from "../pages/TreatmentApprovalsPage";
import MyCommissionPage from "../pages/reception/MyCommissionPage";
import SearchResultPage from "../pages/SearchResultPage";
import DeveloperSecurityLogPage from "../pages/dev/DeveloperSecurityLogPage";
import useAuthStore from "../stores/authStore";
import {
  getUserWorkspaceHome,
  hasStrictRole,
  resolveUserPrimaryRole,
  WORKSPACE_ROUTE_PREFIX_BY_ROLE,
} from "../utils/workspaceRoutes";
import { hasRole } from "../utils/accessUtils";

function WorkspaceRoute({ role, extraRoles = [], children }) {
  const { user, token, initialized } = useAuthStore();
  const location = useLocation();

  if (!initialized) return null;
  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  const roleAllowed =
    hasStrictRole(user, role) || extraRoles.some((allowedRole) => hasStrictRole(user, allowedRole));
  if (!hasRole(user, "owner") && !roleAllowed) {
    return <Navigate to={getUserWorkspaceHome(user)} replace />;
  }
  return children;
}

function AdminGrievanceRoute() {
  const user = useAuthStore((state) => state.user);

  if (hasStrictRole(user, "hr")) {
    return <HrGrievancePage />;
  }

  return <MyGrievancePage />;
}

/** Canonical owner invoice detail lives under Billing → /owner/invoices/:id */
function OwnerInvoiceDetailRedirect() {
  const { paymentId } = useParams();
  return (
    <Navigate to={`/owner/invoices/${encodeURIComponent(paymentId ?? "")}`} replace />
  );
}

function mapLegacyPath(pathname, role) {
  const normalizedRole = role === "developer" ? "owner" : role;
  const prefix = WORKSPACE_ROUTE_PREFIX_BY_ROLE[normalizedRole] ?? "/reception";
  const home = getUserWorkspaceHome({ role: normalizedRole });
  const isOwner = normalizedRole === "owner";

  if (pathname === "/" || pathname === "/dashboard") {
    return normalizedRole === "admin" || normalizedRole === "owner" ? `${prefix}/dashboard` : home;
  }
  if (pathname === "/live-board") {
    if (normalizedRole === "medical_officer" || normalizedRole === "physician") return "/medical-officer/queue";
    if (normalizedRole === "therapist") return "/therapist/tasks";
    if (normalizedRole === "cashier") return "/cashier/pending-payments";
    if (normalizedRole === "owner") return "/owner/live-board";
    return `${prefix}/live-board`;
  }
  if (pathname === "/appointments") {
    return normalizedRole === "therapist" || normalizedRole === "cashier"
      ? home
      : `${prefix}/appointments`;
  }
  if (pathname.startsWith("/patients")) {
    return normalizedRole === "cashier" && !isOwner
      ? home
      : `${prefix}${pathname}`;
  }
  if (pathname === "/packages") {
    return normalizedRole === "therapist" && !isOwner ? home : `${prefix}/packages`;
  }
  if (pathname === "/follow-up-center") {
    return normalizedRole === "therapist" || normalizedRole === "cashier"
      ? home
      : `${prefix}/follow-up-center`;
  }
  if (pathname.startsWith("/payments")) {
    if (isOwner && pathname === "/payments") {
      return `${prefix}/invoices`;
    }
    if (isOwner && /^\/payments\/[^/]+$/.test(pathname)) {
      return `${prefix}/invoices${pathname.slice("/payments".length)}`;
    }
    return normalizedRole === "cashier" || normalizedRole === "admin" || isOwner
      ? `${prefix}${pathname}`
      : home;
  }
  if (pathname.startsWith("/finance")) {
    return normalizedRole === "cashier" ||
      normalizedRole === "accountant" ||
      normalizedRole === "admin" ||
      isOwner
      ? `${prefix}${pathname}`
      : home;
  }
  if (pathname === "/commissions") {
    if (normalizedRole === "medical_officer" || normalizedRole === "physician") {
      return "/medical-officer/commissions";
    }
    if (normalizedRole === "therapist") {
      return "/therapist/commissions";
    }
    return normalizedRole === "admin" || normalizedRole === "reception" || normalizedRole === "sales_marketing" || isOwner
      ? `${prefix}/commissions`
      : home;
  }
  if (pathname.startsWith("/forms")) {
    return normalizedRole === "cashier" && !isOwner ? home : `${prefix}${pathname}`;
  }
  if (pathname.startsWith("/inventory/treatment-templates")) {
    const allowed =
      normalizedRole === "medical_officer" ||
      normalizedRole === "physician" ||
      normalizedRole === "nutritionist" ||
      normalizedRole === "admin" ||
      isOwner ||
      normalizedRole === "reception" ||
      normalizedRole === "sales_marketing" ||
      normalizedRole === "therapist" ||
      normalizedRole === "cashier";
    return allowed ? `${prefix}${pathname}` : home;
  }
  if (pathname.startsWith("/inventory")) {
    return normalizedRole === "cashier" || normalizedRole === "admin" || isOwner
      ? `${prefix}${pathname}`
      : home;
  }
  if (pathname === "/purchases") {
    return normalizedRole === "admin" || isOwner ? `${prefix}/purchases` : home;
  }
  if (pathname === "/users" || pathname === "/settings" || pathname.startsWith("/hr")) {
    if (pathname === "/hr") {
      return normalizedRole === "admin" || isOwner ? `${prefix}/hr/staff` : home;
    }
    return normalizedRole === "admin" || isOwner ? `${prefix}${pathname}` : home;
  }
  if (pathname === "/roles-permissions") {
    return normalizedRole === "owner" ? "/owner/roles-permissions" : home;
  }
  return home;
}

function LegacyRouteRedirect() {
  const { user, token, initialized } = useAuthStore();
  const location = useLocation();

  if (!initialized) return null;
  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const role = resolveUserPrimaryRole(user) ?? "reception";
  const target = mapLegacyPath(location.pathname, role);
  return (
    <Navigate
      to={`${target}${location.search}${location.hash}`}
      replace
    />
  );
}

function DeveloperRoute({ children }) {
  const { user, token, initialized } = useAuthStore();
  const location = useLocation();

  if (!initialized) return null;
  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (!user.is_developer) {
    return <Navigate to={getUserWorkspaceHome(user)} replace />;
  }
  return children;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/dev/security-log"
        element={
          <DeveloperRoute>
            <DeveloperSecurityLogPage />
          </DeveloperRoute>
        }
      />
      <Route
        path="/dev/emr-audit-logs"
        element={
          <DeveloperRoute>
            <EmrAuditLogsPage />
          </DeveloperRoute>
        }
      />
      <Route
        path="/reception"
        element={
          <WorkspaceRoute role="reception" extraRoles={["sales_marketing"]}>
            <ReceptionLayout />
          </WorkspaceRoute>
        }
      >
        <Route index element={<Navigate to="/reception/live-board" replace />} />
        <Route path="live-board" element={<LiveBoardPage />} />
        <Route
          path="visits/:visitId/consultation-room"
          element={
            <ProtectedRoute allowedPermissions={["liveboard.view"]}>
              <ConsultationRoomPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="visits/:visitId/treatment-room"
          element={
            <ProtectedRoute allowedPermissions={["liveboard.view"]}>
              <TreatmentRoomPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="visits/:visitId/preparation-room"
          element={
            <ProtectedRoute allowedPermissions={["liveboard.view"]}>
              <PreparationRoomPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="search"
          element={
            <ProtectedRoute
              allowedPermissions={[
                "inventory.view",
                "treatment_templates.view",
                "packages.view",
              ]}
            >
              <SearchResultPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="appointments"
          element={
            <ProtectedRoute
              allowedPermissions={["appointments.view", "appointments.manage"]}
            >
              <AppointmentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="treatment-approvals"
          element={
            <ProtectedRoute allowedRoles={["medical_officer", "physician"]}>
              <TreatmentApprovalsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="patients"
          element={
            <ProtectedRoute allowedPermissions={["patients.view"]}>
              <PatientsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="patients/new"
          element={
            <ProtectedRoute allowedPermissions={["patients.manage"]}>
              <CreatePatientPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="patients/:id"
          element={
            <ProtectedRoute allowedPermissions={["patients.view"]}>
              <PatientDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="packages"
          element={
            <ProtectedRoute allowedPermissions={["packages.view"]}>
              <PackagesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="customer-packages"
          element={
            <ProtectedRoute allowedPermissions={["packages.view"]}>
              <CustomerPackageListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="commissions"
          element={
            <ProtectedRoute allowedRoles={["reception", "sales_marketing"]}>
              <MyCommissionPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="follow-up-center"
          element={
            <ProtectedRoute allowedPermissions={[
              "follow_up.view",
              "follow_up.update",
              "follow_up.assign",
            ]}>
              <FollowUpCenterPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory/treatment-templates"
          element={
            <ProtectedRoute allowedPermissions={["treatment_templates.view"]}>
              <TreatmentTemplatesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory/treatment-templates/:id"
          element={
            <ProtectedRoute allowedPermissions={["treatment_templates.view"]}>
              <TreatmentTemplateEditorPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="hr/my-daily-record"
          element={
            <ProtectedRoute allowedPermissions={["hr.self_service"]}>
              <MyDailyRecordPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="hr/leave-request"
          element={
            <ProtectedRoute allowedPermissions={["hr.self_service"]}>
              <MyLeaveRequestPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="hr/grievance"
          element={
            <ProtectedRoute allowedRoles={["reception", "sales_marketing"]}>
              <MyGrievancePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="hr/payslip"
          element={
            <ProtectedRoute allowedPermissions={["hr.self_service"]}>
              <MyPayslipPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="hr/job-description"
          element={
            <ProtectedRoute allowedPermissions={["hr.self_service"]}>
              <MyJobDescriptionPage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route
        path="/medical-officer"
        element={
          <WorkspaceRoute role="medical_officer" extraRoles={["physician", "nutritionist"]}>
            <DoctorLayout />
          </WorkspaceRoute>
        }
      >
        <Route index element={<Navigate to="/medical-officer/queue" replace />} />
        <Route path="queue" element={<LiveBoardPage />} />
        <Route
          path="visits/:visitId/consultation-room"
          element={
            <ProtectedRoute allowedPermissions={["liveboard.view"]}>
              <ConsultationRoomPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="visits/:visitId/treatment-room"
          element={
            <ProtectedRoute allowedPermissions={["liveboard.view"]}>
              <TreatmentRoomPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="visits/:visitId/preparation-room"
          element={
            <ProtectedRoute allowedPermissions={["liveboard.view"]}>
              <PreparationRoomPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="patients"
          element={
            <ProtectedRoute allowedPermissions={["patients.view"]}>
              <PatientsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="patients/:id"
          element={
            <ProtectedRoute allowedPermissions={["patients.view"]}>
              <PatientDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="appointments"
          element={
            <ProtectedRoute allowedRoles={["medical_officer", "physician"]}>
              <AppointmentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="commissions"
          element={
            <ProtectedRoute allowedRoles={["medical_officer", "physician"]}>
              <MyCommissionPage />
            </ProtectedRoute>
          }
        />
        <Route path="forms" element={<FormsPage />} />
        <Route path="forms/:id" element={<FormDetailsPage />} />
        <Route
          path="inventory/treatment-templates"
          element={
            <ProtectedRoute allowedPermissions={["treatment_templates.view"]}>
              <TreatmentTemplatesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="customer-packages"
          element={
            <ProtectedRoute allowedPermissions={["packages.view"]}>
              <CustomerPackageListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory/treatment-templates/:id"
          element={
            <ProtectedRoute allowedPermissions={["treatment_templates.view"]}>
              <TreatmentTemplateEditorPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="hr/my-daily-record"
          element={
            <ProtectedRoute allowedPermissions={["hr.self_service"]}>
              <MyDailyRecordPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="hr/leave-request"
          element={
            <ProtectedRoute allowedPermissions={["hr.self_service"]}>
              <MyLeaveRequestPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="hr/grievance"
          element={
            <ProtectedRoute allowedRoles={["medical_officer", "physician"]}>
              <MyGrievancePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="hr/payslip"
          element={
            <ProtectedRoute allowedPermissions={["hr.self_service"]}>
              <MyPayslipPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="hr/job-description"
          element={
            <ProtectedRoute allowedPermissions={["hr.self_service"]}>
              <MyJobDescriptionPage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route
        path="/therapist"
        element={
          <WorkspaceRoute role="therapist">
            <TherapistLayout />
          </WorkspaceRoute>
        }
      >
        <Route index element={<Navigate to="/therapist/tasks" replace />} />
        <Route path="tasks" element={<LiveBoardPage />} />
        <Route
          path="visits/:visitId/consultation-room"
          element={
            <ProtectedRoute allowedPermissions={["liveboard.view"]}>
              <ConsultationRoomPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="visits/:visitId/treatment-room"
          element={
            <ProtectedRoute allowedPermissions={["liveboard.view"]}>
              <TreatmentRoomPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="visits/:visitId/preparation-room"
          element={
            <ProtectedRoute allowedPermissions={["liveboard.view"]}>
              <PreparationRoomPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="search"
          element={
            <ProtectedRoute
              allowedPermissions={[
                "inventory.view",
                "treatment_templates.view",
                "packages.view",
              ]}
            >
              <SearchResultPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="patients"
          element={
            <ProtectedRoute allowedPermissions={["patients.view"]}>
              <PatientsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="patients/:id"
          element={
            <ProtectedRoute allowedPermissions={["patients.view"]}>
              <PatientDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="commissions"
          element={
            <ProtectedRoute allowedRoles={["therapist"]}>
              <MyCommissionPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory/treatment-templates"
          element={
            <ProtectedRoute allowedPermissions={["treatment_templates.view"]}>
              <TreatmentTemplatesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="customer-packages"
          element={
            <ProtectedRoute allowedPermissions={["packages.view"]}>
              <CustomerPackageListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory/treatment-templates/:id"
          element={
            <ProtectedRoute allowedPermissions={["treatment_templates.view"]}>
              <TreatmentTemplateEditorPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="hr/my-daily-record"
          element={
            <ProtectedRoute allowedPermissions={["hr.self_service"]}>
              <MyDailyRecordPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="hr/leave-request"
          element={
            <ProtectedRoute allowedPermissions={["hr.self_service"]}>
              <MyLeaveRequestPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="hr/grievance"
          element={
            <ProtectedRoute allowedRoles={["therapist"]}>
              <MyGrievancePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="hr/payslip"
          element={
            <ProtectedRoute allowedPermissions={["hr.self_service"]}>
              <MyPayslipPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="hr/job-description"
          element={
            <ProtectedRoute allowedPermissions={["hr.self_service"]}>
              <MyJobDescriptionPage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route
        path="/cashier"
        element={
          <WorkspaceRoute role="cashier">
            <CashierLayout />
          </WorkspaceRoute>
        }
      >
        <Route
          index
          element={<Navigate to="/cashier/pending-payments" replace />}
        />
        <Route
          path="search"
          element={
            <ProtectedRoute
              allowedPermissions={[
                "inventory.view",
                "treatment_templates.view",
                "packages.view",
              ]}
            >
              <SearchResultPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="pending-payments"
          element={
            <ProtectedRoute allowedRoles={["cashier"]}>
              <PaymentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="payments/:paymentId"
          element={
            <ProtectedRoute allowedRoles={["cashier"]}>
              <PaymentDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="patients"
          element={
            <ProtectedRoute allowedPermissions={["patients.view"]}>
              <PatientsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="patients/:id"
          element={
            <ProtectedRoute allowedPermissions={["patients.view"]}>
              <PatientDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="packages"
          element={
            <ProtectedRoute allowedPermissions={["packages.view"]}>
              <PackagesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="customer-packages"
          element={
            <ProtectedRoute allowedPermissions={["packages.view"]}>
              <CustomerPackageListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory/treatment-templates"
          element={
            <ProtectedRoute allowedPermissions={["treatment_templates.view"]}>
              <TreatmentTemplatesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory/treatment-templates/:id"
          element={
            <ProtectedRoute allowedPermissions={["treatment_templates.view"]}>
              <TreatmentTemplateEditorPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory"
          element={
            <ProtectedRoute allowedRoles={["cashier"]}>
              <InventoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory/suppliers"
          element={
            <ProtectedRoute allowedRoles={["cashier"]}>
              <SuppliersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory/supplier-returns"
          element={
            <ProtectedRoute allowedRoles={["cashier"]}>
              <SupplierReturnsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory/batch-recalls"
          element={
            <ProtectedRoute allowedRoles={["cashier"]}>
              <BatchRecallsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory/equipment-consumables"
          element={
            <ProtectedRoute allowedRoles={["cashier"]}>
              <EquipmentConsumablesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory/stock-movements"
          element={
            <ProtectedRoute allowedRoles={["cashier"]}>
              <StockMovementsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory/consignment-report"
          element={
            <ProtectedRoute allowedRoles={["cashier"]}>
              <ConsignmentReportPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory/consignment-settlement"
          element={
            <ProtectedRoute allowedRoles={["cashier"]}>
              <ConsignmentSettlementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory/:id"
          element={
            <ProtectedRoute allowedRoles={["cashier"]}>
              <ProductDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="purchases"
          element={
            <ProtectedRoute allowedRoles={["cashier"]}>
              <PurchasesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="purchases/:purchaseId"
          element={
            <ProtectedRoute allowedRoles={["cashier"]}>
              <PurchaseDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="finance/expenses"
          element={
            <ProtectedRoute
              allowedPermissions={["payments.view", "finance.expenses.view"]}
            >
              <FinanceExpensesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="finance/payables"
          element={
            <ProtectedRoute
              allowedPermissions={["payments.view", "finance.payables.view"]}
            >
              <SupplierPayablesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="finance/payables/:payableId"
          element={
            <ProtectedRoute
              allowedPermissions={["payments.view", "finance.payables.view"]}
            >
              <SupplierPayableDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="transactions/expenses"
          element={
            <ProtectedRoute
              allowedPermissions={["payments.view", "finance.expenses.view"]}
            >
              <FinanceExpensesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="transactions/payables"
          element={
            <ProtectedRoute
              allowedPermissions={["payments.view", "finance.payables.view"]}
            >
              <SupplierPayablesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="transactions/payables/:payableId"
          element={
            <ProtectedRoute
              allowedPermissions={["payments.view", "finance.payables.view"]}
            >
              <SupplierPayableDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="finance/chart-of-accounts"
          element={
            <ProtectedRoute
              allowedPermissions={["payments.view", "finance.chart_of_accounts.view"]}
            >
              <FinanceChartOfAccountsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="finance/transaction-methods"
          element={
            <ProtectedRoute
              allowedPermissions={["finance.transaction_methods.manage"]}
            >
              <FinanceTransactionMethodsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="other-income"
          element={
            <ProtectedRoute
              allowedPermissions={["finance.other_income.view"]}
            >
              <OtherIncomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="finance/fixed-assets"
          element={
            <ProtectedRoute
              allowedPermissions={["payments.view", "finance.fixed_assets.view"]}
            >
              <FinanceFixedAssetsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="finance/prepaid-expenses"
          element={
            <ProtectedRoute
              allowedPermissions={[
                "payments.view",
                "finance.prepaid_expenses.view",
              ]}
            >
              <FinancePrepaidExpensesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="finance/fixed-assets/import"
          element={
            <ProtectedRoute
              allowedPermissions={[
                "finance.fixed_assets.import",
                "payments.manage",
              ]}
            >
              <FinanceFixedAssetsImportPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="finance/payroll-statement-inputs"
          element={
            <ProtectedRoute
              allowedPermissions={[
                "payments.view",
                "finance.payroll_statement_inputs.view",
              ]}
            >
              <FinancePayrollStatementInputsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="finance/accounting-guide"
          element={
            <ProtectedRoute
              allowedPermissions={["payments.view", "finance.reports.view"]}
            >
              <AccountingGuidePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="finance/journal-entries"
          element={
            <ProtectedRoute
              allowedPermissions={["payments.view", "finance.reports.view"]}
            >
              <JournalEntriesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="finance/transactions"
          element={
            <ProtectedRoute
              allowedPermissions={["payments.view", "finance.reports.view"]}
            >
              <TransactionPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="finance/general-ledger"
          element={
            <ProtectedRoute
              allowedPermissions={["payments.view", "finance.reports.view"]}
            >
              <GeneralLedgerPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="finance/profit-and-loss"
          element={
            <ProtectedRoute
              allowedPermissions={["payments.view", "finance.reports.view"]}
            >
              <ProfitLossPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="finance/balance-sheet"
          element={
            <ProtectedRoute
              allowedPermissions={["payments.view", "finance.reports.view"]}
            >
              <BalanceSheetPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="finance/cash-movements"
          element={
            <ProtectedRoute
              allowedPermissions={["payments.view", "finance.reports.view"]}
            >
              <CashMovementsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="hr/my-daily-record"
          element={
            <ProtectedRoute allowedPermissions={["hr.self_service"]}>
              <MyDailyRecordPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="hr/leave-request"
          element={
            <ProtectedRoute allowedPermissions={["hr.self_service"]}>
              <MyLeaveRequestPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="hr/grievance"
          element={
            <ProtectedRoute allowedRoles={["cashier"]}>
              <MyGrievancePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="hr/payslip"
          element={
            <ProtectedRoute allowedPermissions={["hr.self_service"]}>
              <MyPayslipPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="hr/job-description"
          element={
            <ProtectedRoute allowedPermissions={["hr.self_service"]}>
              <MyJobDescriptionPage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route
        path="/accountant"
        element={
          <WorkspaceRoute role="accountant">
            <AccountantLayout />
          </WorkspaceRoute>
        }
      >
        <Route
          index
          element={<Navigate to="/accountant/finance/transactions" replace />}
        />
        <Route
          path="finance/expenses"
          element={
            <ProtectedRoute
              allowedPermissions={["payments.view", "finance.expenses.view"]}
            >
              <FinanceExpensesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="finance/payables"
          element={
            <ProtectedRoute
              allowedPermissions={["payments.view", "finance.payables.view"]}
            >
              <SupplierPayablesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="finance/payables/:payableId"
          element={
            <ProtectedRoute
              allowedPermissions={["payments.view", "finance.payables.view"]}
            >
              <SupplierPayableDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="transactions/expenses"
          element={
            <ProtectedRoute
              allowedPermissions={["payments.view", "finance.expenses.view"]}
            >
              <FinanceExpensesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="transactions/payables"
          element={
            <ProtectedRoute
              allowedPermissions={["payments.view", "finance.payables.view"]}
            >
              <SupplierPayablesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="transactions/payables/:payableId"
          element={
            <ProtectedRoute
              allowedPermissions={["payments.view", "finance.payables.view"]}
            >
              <SupplierPayableDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="finance/chart-of-accounts"
          element={
            <ProtectedRoute
              allowedPermissions={["payments.view", "finance.chart_of_accounts.view"]}
            >
              <FinanceChartOfAccountsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="finance/transaction-methods"
          element={
            <ProtectedRoute
              allowedPermissions={["finance.transaction_methods.manage"]}
            >
              <FinanceTransactionMethodsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="other-income"
          element={
            <ProtectedRoute allowedPermissions={["finance.other_income.view"]}>
              <OtherIncomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="finance/fixed-assets"
          element={
            <ProtectedRoute
              allowedPermissions={["payments.view", "finance.fixed_assets.view"]}
            >
              <FinanceFixedAssetsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="finance/prepaid-expenses"
          element={
            <ProtectedRoute
              allowedPermissions={[
                "payments.view",
                "finance.prepaid_expenses.view",
              ]}
            >
              <FinancePrepaidExpensesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="finance/fixed-assets/import"
          element={
            <ProtectedRoute
              allowedPermissions={[
                "finance.fixed_assets.import",
                "payments.manage",
              ]}
            >
              <FinanceFixedAssetsImportPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="finance/payroll-statement-inputs"
          element={
            <ProtectedRoute
              allowedPermissions={[
                "payments.view",
                "finance.payroll_statement_inputs.view",
              ]}
            >
              <FinancePayrollStatementInputsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="finance/accounting-guide"
          element={
            <ProtectedRoute
              allowedPermissions={["payments.view", "finance.reports.view"]}
            >
              <AccountingGuidePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="finance/journal-entries"
          element={
            <ProtectedRoute
              allowedPermissions={["payments.view", "finance.reports.view"]}
            >
              <JournalEntriesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="finance/transactions"
          element={
            <ProtectedRoute
              allowedPermissions={["payments.view", "finance.reports.view"]}
            >
              <TransactionPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="finance/general-ledger"
          element={
            <ProtectedRoute
              allowedPermissions={["payments.view", "finance.reports.view"]}
            >
              <GeneralLedgerPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="finance/profit-and-loss"
          element={
            <ProtectedRoute
              allowedPermissions={["payments.view", "finance.reports.view"]}
            >
              <ProfitLossPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="finance/balance-sheet"
          element={
            <ProtectedRoute
              allowedPermissions={["payments.view", "finance.reports.view"]}
            >
              <BalanceSheetPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="finance/cash-movements"
          element={
            <ProtectedRoute
              allowedPermissions={["payments.view", "finance.reports.view"]}
            >
              <CashMovementsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="hr/my-daily-record"
          element={
            <ProtectedRoute allowedPermissions={["hr.self_service"]}>
              <MyDailyRecordPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="hr/leave-request"
          element={
            <ProtectedRoute allowedPermissions={["hr.self_service"]}>
              <MyLeaveRequestPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="hr/grievance"
          element={
            <ProtectedRoute allowedRoles={["accountant"]}>
              <MyGrievancePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="hr/payslip"
          element={
            <ProtectedRoute allowedPermissions={["hr.self_service"]}>
              <MyPayslipPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="hr/job-description"
          element={
            <ProtectedRoute allowedPermissions={["hr.self_service"]}>
              <MyJobDescriptionPage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route
        path="/admin"
        element={
          <WorkspaceRoute role="admin" extraRoles={["hr"]}>
            <AdminLayout />
          </WorkspaceRoute>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="live-board" element={<LiveBoardPage />} />
        <Route
          path="visits/:visitId/consultation-room"
          element={
            <ProtectedRoute allowedPermissions={["liveboard.view"]}>
              <ConsultationRoomPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="visits/:visitId/treatment-room"
          element={
            <ProtectedRoute allowedPermissions={["liveboard.view"]}>
              <TreatmentRoomPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="visits/:visitId/preparation-room"
          element={
            <ProtectedRoute allowedPermissions={["liveboard.view"]}>
              <PreparationRoomPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="search"
          element={
            <ProtectedRoute
              allowedPermissions={[
                "inventory.view",
                "treatment_templates.view",
                "packages.view",
              ]}
            >
              <SearchResultPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="patients"
          element={
            <ProtectedRoute allowedPermissions={["patients.view"]}>
              <PatientsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="patients/new"
          element={
            <ProtectedRoute allowedPermissions={["patients.manage"]}>
              <CreatePatientPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="patients/:id"
          element={
            <ProtectedRoute allowedPermissions={["patients.view"]}>
              <PatientDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="packages"
          element={
            <ProtectedRoute allowedPermissions={["packages.view"]}>
              <PackagesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="customer-packages"
          element={
            <ProtectedRoute allowedPermissions={["packages.view"]}>
              <CustomerPackageListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="follow-up-center"
          element={
            <ProtectedRoute allowedPermissions={[
              "follow_up.view",
              "follow_up.update",
              "follow_up.assign",
            ]}>
              <FollowUpCenterPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="payments"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <PaymentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="payments/:paymentId"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <PaymentDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="finance/expenses"
          element={
            <ProtectedRoute allowedPermissions={["payments.view", "finance.expenses.view"]}>
              <FinanceExpensesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="finance/payables"
          element={
            <ProtectedRoute allowedPermissions={["payments.view", "finance.payables.view"]}>
              <SupplierPayablesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="finance/payables/:payableId"
          element={
            <ProtectedRoute allowedPermissions={["payments.view", "finance.payables.view"]}>
              <SupplierPayableDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="transactions/expenses"
          element={
            <ProtectedRoute allowedPermissions={["payments.view", "finance.expenses.view"]}>
              <FinanceExpensesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="transactions/payables"
          element={
            <ProtectedRoute allowedPermissions={["payments.view", "finance.payables.view"]}>
              <SupplierPayablesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="transactions/payables/:payableId"
          element={
            <ProtectedRoute allowedPermissions={["payments.view", "finance.payables.view"]}>
              <SupplierPayableDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="finance/chart-of-accounts"
          element={
            <ProtectedRoute
              allowedPermissions={["payments.view", "finance.chart_of_accounts.view"]}
            >
              <FinanceChartOfAccountsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="finance/transaction-methods"
          element={
            <ProtectedRoute
              allowedPermissions={["finance.transaction_methods.manage"]}
            >
              <FinanceTransactionMethodsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="other-income"
          element={
            <ProtectedRoute
              allowedPermissions={["finance.other_income.view"]}
            >
              <OtherIncomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="finance/fixed-assets"
          element={
            <ProtectedRoute allowedPermissions={["payments.view"]}>
              <FinanceFixedAssetsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="finance/prepaid-expenses"
          element={
            <ProtectedRoute allowedPermissions={["payments.view"]}>
              <FinancePrepaidExpensesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="finance/fixed-assets/import"
          element={
            <ProtectedRoute
              allowedPermissions={[
                "finance.fixed_assets.import",
                "payments.manage",
              ]}
            >
              <FinanceFixedAssetsImportPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="finance/payroll-statement-inputs"
          element={
            <ProtectedRoute allowedPermissions={["payments.view"]}>
              <FinancePayrollStatementInputsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="finance/accounting-guide"
          element={
            <ProtectedRoute
              allowedPermissions={["payments.view", "finance.reports.view"]}
            >
              <AccountingGuidePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="finance/journal-entries"
          element={
            <ProtectedRoute allowedPermissions={["payments.view", "finance.reports.view"]}>
              <JournalEntriesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="finance/transactions"
          element={
            <ProtectedRoute allowedPermissions={["payments.view", "finance.reports.view"]}>
              <TransactionPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="finance/general-ledger"
          element={
            <ProtectedRoute allowedPermissions={["payments.view", "finance.reports.view"]}>
              <GeneralLedgerPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="finance/profit-and-loss"
          element={
            <ProtectedRoute allowedPermissions={["payments.view", "finance.reports.view"]}>
              <ProfitLossPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="finance/balance-sheet"
          element={
            <ProtectedRoute allowedPermissions={["payments.view", "finance.reports.view"]}>
              <BalanceSheetPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="finance/cash-movements"
          element={
            <ProtectedRoute allowedPermissions={["payments.view", "finance.reports.view"]}>
              <CashMovementsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="reports/emr-audit-logs"
          element={
            <ProtectedRoute allowedRoles={["owner", "developer"]}>
              <EmrAuditLogsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="reports/appointments"
          element={
            <ProtectedRoute allowedRoles={["owner", "developer"]}>
              <AppointmentsReportPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="commissions"
          element={
            <ProtectedRoute allowedPermissions={["payments.view"]}>
              <CommissionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="users"
          element={
            <ProtectedRoute allowedPermissions={["users.manage"]}>
              <UsersPage />
            </ProtectedRoute>
          }
        />
        <Route path="hr/staff" element={<ProtectedRoute allowedRoles={["hr"]}><StaffProfilesListPage /></ProtectedRoute>} />
        <Route path="hr/staff/create" element={<ProtectedRoute allowedRoles={["hr"]}><StaffProfileCreatePage /></ProtectedRoute>} />
        <Route path="hr/staff/:id" element={<ProtectedRoute allowedRoles={["hr"]}><StaffProfileDetailsPage /></ProtectedRoute>} />
        <Route path="hr/organization" element={<ProtectedRoute allowedRoles={["hr"]}><OrganizationStructurePage /></ProtectedRoute>} />
        <Route path="hr/daily/attendance" element={<ProtectedRoute allowedRoles={["hr"]}><HrAttendancePage /></ProtectedRoute>} />
        <Route path="hr/daily/leaves" element={<ProtectedRoute allowedRoles={["hr"]}><HrLeavesPage /></ProtectedRoute>} />
        <Route path="hr/leave-rules" element={<ProtectedRoute allowedRoles={["hr"]}><HrLeaveRulesPage /></ProtectedRoute>} />
        <Route path="hr/job-positions" element={<ProtectedRoute allowedRoles={["hr"]}><JobPositionsPage /></ProtectedRoute>} />
        <Route path="hr/my-daily-record" element={<ProtectedRoute allowedRoles={["admin"]}><MyDailyRecordPage /></ProtectedRoute>} />
        <Route path="hr/leave-request" element={<ProtectedRoute allowedRoles={["admin"]}><MyLeaveRequestPage /></ProtectedRoute>} />
        <Route path="hr/daily/overtime" element={<ProtectedRoute allowedRoles={["hr"]}><HrOvertimePage /></ProtectedRoute>} />
        <Route path="hr/late-attendance-policy" element={<ProtectedRoute allowedRoles={["hr"]}><HrLateAttendancePolicyPage /></ProtectedRoute>} />
        <Route path="hr/assignments" element={<ProtectedRoute allowedRoles={["hr"]}><HrAssignmentsPage /></ProtectedRoute>} />
        <Route path="hr/payroll" element={<ProtectedRoute allowedRoles={["hr"]}><HrPayrollPage /></ProtectedRoute>} />
        <Route path="hr/salary" element={<ProtectedRoute allowedRoles={["hr"]}><HrSalaryPage /></ProtectedRoute>} />
        <Route path="hr/variable-pay" element={<ProtectedRoute allowedRoles={["hr"]}><HrVariablePayPage /></ProtectedRoute>} />
        <Route path="hr/allowances" element={<ProtectedRoute allowedRoles={["hr"]}><HrAllowancesPage /></ProtectedRoute>} />
        <Route path="hr/deductions" element={<ProtectedRoute allowedRoles={["hr"]}><HrDeductionsPage /></ProtectedRoute>} />
        <Route path="hr/salary-holds" element={<ProtectedRoute allowedRoles={["hr"]}><HrSalaryHoldRegisterPage /></ProtectedRoute>} />
        <Route path="hr/compensation" element={<ProtectedRoute allowedRoles={["hr"]}><HrCompensationPage /></ProtectedRoute>} />
        <Route path="hr/grievance" element={<ProtectedRoute allowedRoles={["admin", "hr"]}><AdminGrievanceRoute /></ProtectedRoute>} />
        <Route path="hr/payslip" element={<ProtectedRoute allowedRoles={["admin"]}><MyPayslipPage /></ProtectedRoute>} />
        <Route path="hr/job-description" element={<ProtectedRoute allowedRoles={["admin"]}><MyJobDescriptionPage /></ProtectedRoute>} />
        <Route path="hr/public-holidays" element={<ProtectedRoute allowedRoles={["hr"]}><HrPublicHolidaysPage /></ProtectedRoute>} />
        <Route path="hr/reports" element={<ProtectedRoute allowedRoles={["hr"]}><HrReportsPage /></ProtectedRoute>} />
        <Route path="forms" element={<FormsPage />} />
        <Route path="forms/:id" element={<FormDetailsPage />} />
        <Route
          path="forms/:id/edit"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <FormBuilderPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="settings"
          element={
            <ProtectedRoute allowedPermissions={["settings.manage"]}>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="roles-permissions"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <RolesPermissionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory"
          element={
            <ProtectedRoute allowedPermissions={["inventory.view"]}>
              <InventoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory/treatment-templates"
          element={
            <ProtectedRoute allowedPermissions={["treatment_templates.view"]}>
              <TreatmentTemplatesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory/treatment-templates/:id"
          element={
            <ProtectedRoute allowedPermissions={["treatment_templates.view"]}>
              <TreatmentTemplateEditorPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory/suppliers"
          element={
            <ProtectedRoute allowedPermissions={["inventory.view"]}>
              <SuppliersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory/supplier-returns"
          element={
            <ProtectedRoute allowedPermissions={["inventory.view"]}>
              <SupplierReturnsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory/batch-recalls"
          element={
            <ProtectedRoute allowedPermissions={["inventory.view"]}>
              <BatchRecallsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory/equipment-consumables"
          element={
            <ProtectedRoute allowedPermissions={["inventory.view"]}>
              <EquipmentConsumablesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory/stock-movements"
          element={
            <ProtectedRoute allowedPermissions={["inventory.view"]}>
              <StockMovementsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory/consignment-report"
          element={
            <ProtectedRoute allowedPermissions={["inventory.view"]}>
              <ConsignmentReportPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory/consignment-settlement"
          element={
            <ProtectedRoute allowedPermissions={["inventory.view"]}>
              <ConsignmentSettlementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory/:id"
          element={
            <ProtectedRoute allowedPermissions={["inventory.view"]}>
              <ProductDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="purchases"
          element={
            <ProtectedRoute allowedPermissions={["inventory.view"]}>
              <PurchasesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="purchases/:purchaseId"
          element={
            <ProtectedRoute allowedPermissions={["inventory.view"]}>
              <PurchaseDetailPage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route
        path="/owner"
        element={
          <WorkspaceRoute role="owner" extraRoles={["developer"]}>
            <OwnerLayout />
          </WorkspaceRoute>
        }
      >
        <Route index element={<Navigate to="/owner/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="live-board" element={<LiveBoardPage />} />
        <Route
          path="visits/:visitId/consultation-room"
          element={
            <ProtectedRoute allowedPermissions={["liveboard.view"]}>
              <ConsultationRoomPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="visits/:visitId/treatment-room"
          element={
            <ProtectedRoute allowedPermissions={["liveboard.view"]}>
              <TreatmentRoomPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="visits/:visitId/preparation-room"
          element={
            <ProtectedRoute allowedPermissions={["liveboard.view"]}>
              <PreparationRoomPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="search"
          element={
            <ProtectedRoute
              allowedPermissions={[
                "inventory.view",
                "treatment_templates.view",
                "packages.view",
              ]}
            >
              <SearchResultPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="treatment-approvals"
          element={
            <ProtectedRoute allowedRoles={["owner"]}>
              <TreatmentApprovalsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="appointments"
          element={
            <ProtectedRoute allowedRoles={["owner"]}>
              <AppointmentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="patients"
          element={
            <ProtectedRoute allowedPermissions={["patients.view"]}>
              <PatientsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="patients/new"
          element={
            <ProtectedRoute allowedPermissions={["patients.manage"]}>
              <CreatePatientPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="patients/:id"
          element={
            <ProtectedRoute allowedPermissions={["patients.view"]}>
              <PatientDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="packages"
          element={
            <ProtectedRoute allowedPermissions={["packages.view"]}>
              <PackagesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="customer-packages"
          element={
            <ProtectedRoute allowedPermissions={["packages.view"]}>
              <CustomerPackageListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="follow-up-center"
          element={
            <ProtectedRoute allowedPermissions={[
              "follow_up.view",
              "follow_up.update",
              "follow_up.assign",
            ]}>
              <FollowUpCenterPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="invoices"
          element={
            <ProtectedRoute allowedRoles={["owner"]}>
              <PaymentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="invoices/:paymentId"
          element={
            <ProtectedRoute allowedRoles={["owner"]}>
              <PaymentDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="payments"
          element={
            <Navigate to="/owner/invoices" replace />
          }
        />
        <Route
          path="payments/:paymentId"
          element={<OwnerInvoiceDetailRedirect />}
        />
        <Route
          path="finance"
          element={<Navigate to="/owner/finance/transactions" replace />}
        />
        <Route
          path="finance/reports"
          element={<Navigate to="/owner/reports/finance" replace />}
        />
        <Route
          path="finance/expenses"
          element={
            <ProtectedRoute allowedPermissions={["payments.view", "finance.expenses.view"]}>
              <FinanceExpensesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="finance/payables"
          element={
            <ProtectedRoute allowedPermissions={["payments.view", "finance.payables.view"]}>
              <SupplierPayablesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="finance/payables/:payableId"
          element={
            <ProtectedRoute allowedPermissions={["payments.view", "finance.payables.view"]}>
              <SupplierPayableDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="transactions/expenses"
          element={
            <ProtectedRoute allowedPermissions={["payments.view", "finance.expenses.view"]}>
              <FinanceExpensesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="transactions/payables"
          element={
            <ProtectedRoute allowedPermissions={["payments.view", "finance.payables.view"]}>
              <SupplierPayablesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="transactions/payables/:payableId"
          element={
            <ProtectedRoute allowedPermissions={["payments.view", "finance.payables.view"]}>
              <SupplierPayableDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="finance/chart-of-accounts"
          element={
            <ProtectedRoute
              allowedPermissions={["payments.view", "finance.chart_of_accounts.view"]}
            >
              <FinanceChartOfAccountsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="finance/transaction-methods"
          element={
            <ProtectedRoute
              allowedPermissions={["finance.transaction_methods.manage"]}
            >
              <FinanceTransactionMethodsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="other-income"
          element={
            <ProtectedRoute
              allowedPermissions={["finance.other_income.view"]}
            >
              <OtherIncomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="finance/fixed-assets"
          element={
            <ProtectedRoute allowedPermissions={["payments.view"]}>
              <FinanceFixedAssetsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="finance/prepaid-expenses"
          element={
            <ProtectedRoute allowedPermissions={["payments.view"]}>
              <FinancePrepaidExpensesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="finance/fixed-assets/import"
          element={
            <ProtectedRoute
              allowedPermissions={[
                "finance.fixed_assets.import",
                "payments.manage",
              ]}
            >
              <FinanceFixedAssetsImportPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="finance/payroll-statement-inputs"
          element={
            <ProtectedRoute allowedPermissions={["payments.view"]}>
              <FinancePayrollStatementInputsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="finance/accounting-guide"
          element={
            <ProtectedRoute
              allowedPermissions={["payments.view", "finance.reports.view"]}
            >
              <AccountingGuidePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="finance/journal-entries"
          element={
            <ProtectedRoute allowedPermissions={["payments.view", "finance.reports.view"]}>
              <JournalEntriesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="finance/transactions"
          element={
            <ProtectedRoute allowedPermissions={["payments.view", "finance.reports.view"]}>
              <TransactionPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="finance/general-ledger"
          element={
            <ProtectedRoute allowedPermissions={["payments.view", "finance.reports.view"]}>
              <GeneralLedgerPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="finance/profit-and-loss"
          element={
            <ProtectedRoute allowedPermissions={["payments.view", "finance.reports.view"]}>
              <ProfitLossPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="finance/balance-sheet"
          element={
            <ProtectedRoute allowedPermissions={["payments.view", "finance.reports.view"]}>
              <BalanceSheetPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="finance/cash-movements"
          element={
            <ProtectedRoute allowedPermissions={["payments.view", "finance.reports.view"]}>
              <CashMovementsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="reports/emr-audit-logs"
          element={
            <ProtectedRoute allowedRoles={["owner", "developer"]}>
              <EmrAuditLogsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="reports/appointments"
          element={
            <ProtectedRoute allowedRoles={["owner", "developer"]}>
              <AppointmentsReportPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="reports/treatment-margins"
          element={
            <ProtectedRoute allowedRoles={["owner", "developer"]}>
              <TreatmentMarginsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="reports/finance"
          element={
            <ProtectedRoute allowedRoles={["owner"]}>
              <FinanceReportsPage />
            </ProtectedRoute>
          }
        />
        <Route path="forms" element={<FormsPage />} />
        <Route path="forms/:id" element={<FormDetailsPage />} />
        <Route
          path="forms/:id/edit"
          element={
            <ProtectedRoute allowedRoles={["owner"]}>
              <FormBuilderPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="users"
          element={
            <ProtectedRoute allowedPermissions={["users.manage"]}>
              <UsersPage />
            </ProtectedRoute>
          }
        />
        <Route path="hr/staff" element={<ProtectedRoute allowedPermissions={["hr.view"]}><StaffProfilesListPage /></ProtectedRoute>} />
        <Route path="hr/staff/create" element={<ProtectedRoute allowedPermissions={["hr.manage"]}><StaffProfileCreatePage /></ProtectedRoute>} />
        <Route path="hr/staff/:id" element={<ProtectedRoute allowedPermissions={["hr.view"]}><StaffProfileDetailsPage /></ProtectedRoute>} />
        <Route path="hr/organization" element={<ProtectedRoute allowedPermissions={["hr.view"]}><OrganizationStructurePage /></ProtectedRoute>} />
        <Route path="hr/daily/attendance" element={<ProtectedRoute allowedPermissions={["hr.view"]}><HrAttendancePage /></ProtectedRoute>} />
        <Route path="hr/daily/leaves" element={<ProtectedRoute allowedPermissions={["hr.view"]}><HrLeavesPage /></ProtectedRoute>} />
        <Route path="hr/leave-rules" element={<ProtectedRoute allowedPermissions={["hr.manage"]}><HrLeaveRulesPage /></ProtectedRoute>} />
        <Route path="hr/job-positions" element={<ProtectedRoute allowedPermissions={["hr.manage"]}><JobPositionsPage /></ProtectedRoute>} />
        <Route path="hr/daily/overtime" element={<ProtectedRoute allowedPermissions={["hr.view"]}><HrOvertimePage /></ProtectedRoute>} />
        <Route path="hr/late-attendance-policy" element={<ProtectedRoute allowedPermissions={["hr.manage"]}><HrLateAttendancePolicyPage /></ProtectedRoute>} />
        <Route path="hr/assignments" element={<ProtectedRoute allowedPermissions={["hr.view"]}><HrAssignmentsPage /></ProtectedRoute>} />
        <Route path="hr/payroll" element={<ProtectedRoute allowedPermissions={["hr.view"]}><HrPayrollPage /></ProtectedRoute>} />
        <Route path="hr/salary" element={<ProtectedRoute allowedPermissions={["hr.view"]}><HrSalaryPage /></ProtectedRoute>} />
        <Route path="hr/variable-pay" element={<ProtectedRoute allowedPermissions={["hr.view"]}><HrVariablePayPage /></ProtectedRoute>} />
        <Route path="hr/allowances" element={<ProtectedRoute allowedPermissions={["hr.view"]}><HrAllowancesPage /></ProtectedRoute>} />
        <Route path="hr/deductions" element={<ProtectedRoute allowedPermissions={["hr.view"]}><HrDeductionsPage /></ProtectedRoute>} />
        <Route path="hr/salary-holds" element={<ProtectedRoute allowedPermissions={["hr.view"]}><HrSalaryHoldRegisterPage /></ProtectedRoute>} />
        <Route path="hr/compensation" element={<ProtectedRoute allowedPermissions={["hr.view"]}><HrCompensationPage /></ProtectedRoute>} />
        <Route path="hr/grievance" element={<ProtectedRoute allowedRoles={["owner"]}><HrGrievancePage /></ProtectedRoute>} />
        <Route path="hr/public-holidays" element={<ProtectedRoute allowedPermissions={["hr.view"]}><HrPublicHolidaysPage /></ProtectedRoute>} />
        <Route path="hr/reports" element={<ProtectedRoute allowedPermissions={["hr.reports.view"]}><HrReportsPage /></ProtectedRoute>} />
        <Route
          path="settings"
          element={
            <ProtectedRoute allowedPermissions={["settings.manage"]}>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="liveboard-rules"
          element={
            <ProtectedRoute allowedRoles={["owner", "developer"]}>
              <LiveBoardRulesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory"
          element={
            <ProtectedRoute allowedPermissions={["inventory.view"]}>
              <InventoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory/treatment-templates"
          element={
            <ProtectedRoute allowedPermissions={["treatment_templates.view"]}>
              <TreatmentTemplatesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory/treatment-templates/:id"
          element={
            <ProtectedRoute allowedPermissions={["treatment_templates.view"]}>
              <TreatmentTemplateEditorPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory/suppliers"
          element={
            <ProtectedRoute allowedPermissions={["inventory.view"]}>
              <SuppliersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory/supplier-returns"
          element={
            <ProtectedRoute allowedPermissions={["inventory.view"]}>
              <SupplierReturnsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory/batch-recalls"
          element={
            <ProtectedRoute allowedPermissions={["inventory.view"]}>
              <BatchRecallsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory/equipment-consumables"
          element={
            <ProtectedRoute allowedPermissions={["inventory.view"]}>
              <EquipmentConsumablesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory/stock-movements"
          element={
            <ProtectedRoute allowedPermissions={["inventory.view"]}>
              <StockMovementsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory/consignment-report"
          element={
            <ProtectedRoute allowedPermissions={["inventory.view"]}>
              <ConsignmentReportPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory/consignment-settlement"
          element={
            <ProtectedRoute allowedPermissions={["inventory.view"]}>
              <ConsignmentSettlementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory/:id"
          element={
            <ProtectedRoute allowedPermissions={["inventory.view"]}>
              <ProductDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="purchases"
          element={
            <ProtectedRoute allowedPermissions={["inventory.view"]}>
              <PurchasesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="purchases/:purchaseId"
          element={
            <ProtectedRoute allowedPermissions={["inventory.view"]}>
              <PurchaseDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="commissions"
          element={
            <ProtectedRoute allowedPermissions={["payments.view"]}>
              <CommissionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="roles-permissions"
          element={
            <ProtectedRoute allowedRoles={["owner"]}>
              <RolesPermissionsPage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<LegacyRouteRedirect />} />
    </Routes>
  );
}
