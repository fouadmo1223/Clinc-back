/**
 * Granular permission strings. Each role maps to a default set below,
 * but individual staff members can be granted/revoked specific permissions
 * on top of their role (see StaffSchema.permissionOverrides).
 */
export enum Permission {
  PATIENTS_READ = 'patients.read',
  PATIENTS_CREATE = 'patients.create',
  PATIENTS_UPDATE = 'patients.update',
  PATIENTS_DELETE = 'patients.delete',
  PATIENTS_MERGE = 'patients.merge',

  PATIENTS_MEDICAL_READ = 'patients.medical.read',
  PATIENTS_MEDICAL_UPDATE = 'patients.medical.update',

  APPOINTMENTS_READ = 'appointments.read',
  APPOINTMENTS_CREATE = 'appointments.create',
  APPOINTMENTS_UPDATE = 'appointments.update',
  APPOINTMENTS_CANCEL = 'appointments.cancel',

  QUEUE_MANAGE = 'queue.manage',

  VISITS_READ = 'visits.read',
  VISITS_CREATE = 'visits.create',
  VISITS_UPDATE = 'visits.update',

  PRESCRIPTIONS_CREATE = 'prescriptions.create',
  PRESCRIPTIONS_READ = 'prescriptions.read',

  DOCUMENTS_READ = 'documents.read',
  DOCUMENTS_UPLOAD = 'documents.upload',

  PAYMENTS_READ = 'payments.read',
  PAYMENTS_CREATE = 'payments.create',
  PAYMENTS_REFUND = 'payments.refund',

  INVOICES_READ = 'invoices.read',
  INVOICES_CREATE = 'invoices.create',

  EXPENSES_READ = 'expenses.read',
  EXPENSES_MANAGE = 'expenses.manage',

  REPORTS_READ = 'reports.read',

  STAFF_READ = 'staff.read',
  STAFF_MANAGE = 'staff.manage',

  DOCTORS_READ = 'doctors.read',
  DOCTORS_MANAGE = 'doctors.manage',

  BRANCHES_MANAGE = 'branches.manage',

  SETTINGS_MANAGE = 'settings.manage',

  AUDIT_READ = 'audit.read',
}

export const ROLE_DEFAULT_PERMISSIONS: Record<string, Permission[]> = {
  SUPER_ADMIN: Object.values(Permission),
  CLINIC_OWNER: Object.values(Permission),
  DOCTOR: [
    Permission.PATIENTS_READ,
    Permission.PATIENTS_MEDICAL_READ,
    Permission.PATIENTS_MEDICAL_UPDATE,
    Permission.APPOINTMENTS_READ,
    Permission.APPOINTMENTS_UPDATE,
    Permission.QUEUE_MANAGE,
    Permission.VISITS_READ,
    Permission.VISITS_CREATE,
    Permission.VISITS_UPDATE,
    Permission.PRESCRIPTIONS_CREATE,
    Permission.PRESCRIPTIONS_READ,
    Permission.DOCUMENTS_READ,
    Permission.DOCUMENTS_UPLOAD,
    Permission.REPORTS_READ,
  ],
  RECEPTIONIST: [
    Permission.PATIENTS_READ,
    Permission.PATIENTS_CREATE,
    Permission.PATIENTS_UPDATE,
    Permission.APPOINTMENTS_READ,
    Permission.APPOINTMENTS_CREATE,
    Permission.APPOINTMENTS_UPDATE,
    Permission.APPOINTMENTS_CANCEL,
    Permission.QUEUE_MANAGE,
    Permission.PAYMENTS_READ,
    Permission.PAYMENTS_CREATE,
    Permission.INVOICES_READ,
    Permission.INVOICES_CREATE,
    Permission.DOCUMENTS_READ,
    Permission.DOCUMENTS_UPLOAD,
  ],
  NURSE: [
    Permission.PATIENTS_READ,
    Permission.PATIENTS_MEDICAL_READ,
    Permission.APPOINTMENTS_READ,
    Permission.QUEUE_MANAGE,
    Permission.VISITS_READ,
    Permission.VISITS_CREATE,
    Permission.DOCUMENTS_READ,
    Permission.DOCUMENTS_UPLOAD,
  ],
  ACCOUNTANT: [
    Permission.PAYMENTS_READ,
    Permission.PAYMENTS_CREATE,
    Permission.PAYMENTS_REFUND,
    Permission.INVOICES_READ,
    Permission.INVOICES_CREATE,
    Permission.EXPENSES_READ,
    Permission.EXPENSES_MANAGE,
    Permission.REPORTS_READ,
  ],
};
