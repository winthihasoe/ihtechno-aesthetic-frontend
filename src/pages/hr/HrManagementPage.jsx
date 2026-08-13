import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { resolveApiError } from "../../services/apiClient";
import useToastStore from "../../stores/toastStore";
import { getUsers } from "../../services/usersService";
import {
  approveLeave,
  checkInStaff,
  createLeave,
  createOvertime,
  createStaffAssignment,
  createStaffProfile,
  createStaffSalary,
  finalizePayroll,
  generatePayroll,
  getAttendanceLogs,
  getHrPayrollReport,
  getHrPerformanceReport,
  getLeaves,
  getOvertimes,
  getPayrolls,
  getStaffAssignments,
  getStaffGrievances,
  getStaffSalaries,
  getStaffs,
} from "../../services/hrService";

const tabs = ["staff", "time", "payroll", "reports", "assignment", "grievance"];

export default function HrManagementPage() {
  const { pushToast } = useToastStore();
  const [activeTab, setActiveTab] = useState("staff");
  const [users, setUsers] = useState([]);
  const [staffs, setStaffs] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [overtimes, setOvertimes] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [payrolls, setPayrolls] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [grievances, setGrievances] = useState([]);
  const [payrollReport, setPayrollReport] = useState([]);
  const [performanceReport, setPerformanceReport] = useState([]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [forms, setForms] = useState({
    staffUserId: "",
    hireDate: new Date().toISOString().slice(0, 10),
    leaveStaffId: "",
    leaveType: "annual",
    leaveStart: new Date().toISOString().slice(0, 10),
    leaveEnd: new Date().toISOString().slice(0, 10),
    overtimeStaffId: "",
    overtimeDate: new Date().toISOString().slice(0, 10),
    overtimeHours: "1",
    salaryStaffId: "",
    baseSalary: "",
    assignmentStaffId: "",
    assignmentModule: "treatment",
    assignmentRole: "performer",
    assignmentRef: "",
  });

  const staffOptions = useMemo(
    () => staffs.map((staff) => ({ id: staff.id, name: staff.name })),
    [staffs],
  );

  const loadAll = useCallback(async () => {
    try {
      const [
        usersData,
        staffsData,
        attendanceData,
        leaveData,
        overtimeData,
        salaryData,
        payrollData,
        assignmentData,
        grievanceData,
        payrollReportData,
        performanceData,
      ] = await Promise.all([
        getUsers(),
        getStaffs(),
        getAttendanceLogs(),
        getLeaves(),
        getOvertimes(),
        getStaffSalaries(),
        getPayrolls(),
        getStaffAssignments(),
        getStaffGrievances(),
        getHrPayrollReport({ month }),
        getHrPerformanceReport(),
      ]);
      setUsers(usersData);
      setStaffs(staffsData);
      setAttendance(attendanceData.data || []);
      setLeaves(leaveData.data || []);
      setOvertimes(overtimeData.data || []);
      setSalaries(salaryData.data || []);
      setPayrolls(payrollData.data || []);
      setAssignments(assignmentData.data || []);
      setGrievances(grievanceData.data || []);
      setPayrollReport(payrollReportData || []);
      setPerformanceReport(performanceData || []);
    } catch (error) {
      pushToast({ message: resolveApiError(error, "Failed to load HR data."), severity: "error" });
    }
  }, [month, pushToast]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadAll();
    }, 0);
    return () => clearTimeout(timeout);
  }, [loadAll]);

  const run = async (callback, message) => {
    try {
      await callback();
      pushToast({ message, severity: "success" });
      await loadAll();
    } catch (error) {
      pushToast({ message: resolveApiError(error, "Request failed."), severity: "error" });
    }
  };

  return (
    <Box>
      <Typography variant="h5" mb={0.5}>HR Management</Typography>
      <Typography variant="body2" color="text.secondary" mb={2}>
        Staff, attendance, payroll, assignments, grievance, and HR reports.
      </Typography>
      <Tabs value={activeTab} onChange={(_, value) => setActiveTab(value)} sx={{ mb: 2 }}>
        {tabs.map((tab) => <Tab key={tab} value={tab} label={tab.toUpperCase()} />)}
      </Tabs>

      {activeTab === "staff" && (
        <Grid container spacing={2}>
          <Grid item xs={12} md={5}>
            <Card><CardContent>
              <Typography variant="subtitle1" mb={1}>Create Staff Profile</Typography>
              <Stack spacing={1}>
                <TextField select size="small" label="User" value={forms.staffUserId} onChange={(e) => setForms((p) => ({ ...p, staffUserId: e.target.value }))}>
                  {users.map((user) => <MenuItem key={user.id} value={user.id}>{user.name}</MenuItem>)}
                </TextField>
                <TextField type="date" size="small" label="Hire date" InputLabelProps={{ shrink: true }} value={forms.hireDate} onChange={(e) => setForms((p) => ({ ...p, hireDate: e.target.value }))} />
                <Button variant="contained" onClick={() => run(() => createStaffProfile({ user_id: Number(forms.staffUserId), hire_date: forms.hireDate }), "Staff profile created.")}>Save profile</Button>
              </Stack>
            </CardContent></Card>
          </Grid>
          <Grid item xs={12} md={7}>
            <Card><CardContent><Typography variant="subtitle1" mb={1}>Staff list</Typography>
              <Stack spacing={1}>
                {staffs.slice(0, 12).map((staff) => (
                  <Box key={staff.id} display="flex" justifyContent="space-between">
                    <Typography>{staff.name}</Typography>
                    <Chip size="small" label={staff.staff_profile?.employment_status || "no profile"} />
                  </Box>
                ))}
              </Stack>
            </CardContent></Card>
          </Grid>
        </Grid>
      )}

      {activeTab === "time" && (
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Card><CardContent><Typography variant="subtitle1">Attendance</Typography>
              <TextField select fullWidth size="small" label="Staff" sx={{ mt: 1 }} value={forms.leaveStaffId} onChange={(e) => setForms((p) => ({ ...p, leaveStaffId: e.target.value }))}>
                {staffOptions.map((staff) => <MenuItem key={staff.id} value={staff.id}>{staff.name}</MenuItem>)}
              </TextField>
              <Stack direction="row" spacing={1} mt={1}>
                <Button variant="contained" onClick={() => run(() => checkInStaff({ staff_id: Number(forms.leaveStaffId) }), "Checked in.")}>Check in</Button>
              </Stack>
              <Typography variant="body2" mt={1}>Today logs: {attendance.length}</Typography>
              <Typography variant="body2">Overtime entries: {overtimes.length}</Typography>
            </CardContent></Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card><CardContent><Typography variant="subtitle1">Leave</Typography>
              <Stack spacing={1} mt={1}>
                <TextField select size="small" label="Staff" value={forms.leaveStaffId} onChange={(e) => setForms((p) => ({ ...p, leaveStaffId: e.target.value }))}>
                  {staffOptions.map((staff) => <MenuItem key={staff.id} value={staff.id}>{staff.name}</MenuItem>)}
                </TextField>
                <TextField select size="small" label="Type" value={forms.leaveType} onChange={(e) => setForms((p) => ({ ...p, leaveType: e.target.value }))}>
                  <MenuItem value="annual">Annual</MenuItem><MenuItem value="sick">Sick</MenuItem><MenuItem value="unpaid">Unpaid</MenuItem>
                </TextField>
                <Button variant="contained" onClick={() => run(() => createLeave({ staff_id: Number(forms.leaveStaffId), leave_type: forms.leaveType, start_date: forms.leaveStart, end_date: forms.leaveEnd }), "Leave requested.")}>Submit leave</Button>
                {leaves[0] && <Button onClick={() => run(() => approveLeave(leaves[0].id), "Latest leave approved.")}>Approve latest</Button>}
              </Stack>
            </CardContent></Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card><CardContent><Typography variant="subtitle1">Overtime</Typography>
              <Stack spacing={1} mt={1}>
                <TextField select size="small" label="Staff" value={forms.overtimeStaffId} onChange={(e) => setForms((p) => ({ ...p, overtimeStaffId: e.target.value }))}>
                  {staffOptions.map((staff) => <MenuItem key={staff.id} value={staff.id}>{staff.name}</MenuItem>)}
                </TextField>
                <TextField size="small" label="Hours" value={forms.overtimeHours} onChange={(e) => setForms((p) => ({ ...p, overtimeHours: e.target.value }))} />
                <Button variant="contained" onClick={() => run(() => createOvertime({ staff_id: Number(forms.overtimeStaffId), date: forms.overtimeDate, hours: Number(forms.overtimeHours) }), "Overtime added.")}>Save overtime</Button>
              </Stack>
            </CardContent></Card>
          </Grid>
        </Grid>
      )}

      {activeTab === "payroll" && (
        <Card><CardContent>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="center">
            <TextField type="month" size="small" value={month} onChange={(e) => setMonth(e.target.value)} />
            <TextField
              select
              size="small"
              label="Staff"
              value={forms.salaryStaffId}
              onChange={(e) => setForms((p) => ({ ...p, salaryStaffId: e.target.value }))}
            >
              {staffOptions.map((staff) => <MenuItem key={staff.id} value={staff.id}>{staff.name}</MenuItem>)}
            </TextField>
            <TextField
              size="small"
              label="Base salary"
              value={forms.baseSalary}
              onChange={(e) => setForms((p) => ({ ...p, baseSalary: e.target.value }))}
            />
            <Button
              onClick={() => run(() => createStaffSalary({
                staff_id: Number(forms.salaryStaffId),
                base_salary: Number(forms.baseSalary),
                effective_from: `${month}-01`,
              }), "Salary saved.")}
            >
              Save salary
            </Button>
            <Button variant="contained" onClick={() => run(() => generatePayroll({ month }), "Payroll generated.")}>Generate</Button>
            {payrolls[0] && <Button onClick={() => run(() => finalizePayroll(payrolls[0].id), "Latest payroll finalized.")}>Finalize latest</Button>}
          </Stack>
          <Divider sx={{ my: 2 }} />
          <Typography variant="body2">Salary records: {salaries.length}</Typography>
          <Typography variant="body2">Payroll records: {payrolls.length}</Typography>
        </CardContent></Card>
      )}

      {activeTab === "assignment" && (
        <Card><CardContent>
          <Typography variant="subtitle1" mb={1}>Staff assignments</Typography>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
            <TextField select size="small" label="Staff" value={forms.assignmentStaffId} onChange={(e) => setForms((p) => ({ ...p, assignmentStaffId: e.target.value }))}>
              {staffOptions.map((staff) => <MenuItem key={staff.id} value={staff.id}>{staff.name}</MenuItem>)}
            </TextField>
            <TextField size="small" label="Reference ID" value={forms.assignmentRef} onChange={(e) => setForms((p) => ({ ...p, assignmentRef: e.target.value }))} />
            <Button variant="contained" onClick={() => run(() => createStaffAssignment({ staff_id: Number(forms.assignmentStaffId), module_type: forms.assignmentModule, reference_id: Number(forms.assignmentRef), role: forms.assignmentRole }), "Assignment added.")}>Assign</Button>
          </Stack>
          <Typography variant="body2" mt={1}>Assignments count: {assignments.length}</Typography>
        </CardContent></Card>
      )}

      {activeTab === "grievance" && (
        <Card><CardContent>
          <Typography variant="subtitle1">Grievance overview</Typography>
          <Typography variant="body2" mt={1}>Submitted records: {grievances.length}</Typography>
        </CardContent></Card>
      )}

      {activeTab === "reports" && (
        <Card><CardContent>
          <Typography variant="subtitle1">HR reports snapshot</Typography>
          <Typography variant="body2" mt={1}>Payroll rows for {month}: {payrollReport.length}</Typography>
          <Typography variant="body2">Performance rows: {performanceReport.length}</Typography>
        </CardContent></Card>
      )}
    </Box>
  );
}
