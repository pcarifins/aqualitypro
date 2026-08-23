import { User, UserRole } from '../types';

export interface UserPermissions {
  canExecuteGLT: boolean;
  canExecuteDynotest: boolean;
  canExecuteTestbench: boolean;
  canManageQueue: boolean;
  canViewHistory: boolean;
  canViewAnalytics: boolean;
  canManageMasterData: boolean;
}

export function getUserPermissions(user?: User | null): UserPermissions {
  if (!user) {
    return {
      canExecuteGLT: false,
      canExecuteDynotest: false,
      canExecuteTestbench: false,
      canManageQueue: false,
      canViewHistory: false,
      canViewAnalytics: false,
      canManageMasterData: false,
    };
  }

  const role = (user.role || '').toUpperCase();

  const isAdmin = role === 'ADMIN' || user.role === 'administrator';
  const isSupervisor = role === 'SUPERVISOR' || user.role === 'supervisor';
  const isQC = role === 'QC';
  const isPPC = role === 'PPC';
  const isGLTOpt = role === 'GLT_OPT';
  const isDynoOpt = role === 'DYNO_OPT';
  const isTestbenchOpt = role === 'TESTBENCH_OPT';
  const isGenericOperator = role === 'OPERATOR' || user.role === 'operator';

  return {
    canExecuteGLT: isGLTOpt || isSupervisor || isAdmin || isQC || isGenericOperator,
    canExecuteDynotest: isDynoOpt || isSupervisor || isAdmin || isQC || isGenericOperator,
    canExecuteTestbench: isTestbenchOpt || isSupervisor || isAdmin || isQC || isGenericOperator,
    canManageQueue: isPPC || isSupervisor || isAdmin,
    canViewHistory: isPPC || isSupervisor || isAdmin || isQC,
    canViewAnalytics: isSupervisor || isAdmin || isQC,
    canManageMasterData: isAdmin || isSupervisor,
  };
}

export function canUserAccessCompGroup(user?: User | null, compGroup?: string): boolean {
  if (!user) return false;
  const role = (user.role || '').toUpperCase();

  // Admin, Supervisor, PPC, and QC can access all component groups
  if (
    role === 'ADMIN' ||
    user.role === 'administrator' ||
    role === 'SUPERVISOR' ||
    user.role === 'supervisor' ||
    role === 'PPC' ||
    role === 'QC'
  ) {
    return true;
  }

  // If user has specific allowedCompGroups configured
  if (user.allowedCompGroups && user.allowedCompGroups.length > 0) {
    if (!compGroup) return true;
    const targetComp = compGroup.toUpperCase();
    return user.allowedCompGroups.some((group) => {
      const gUpper = group.toUpperCase();
      if (gUpper === 'ENGINE' && targetComp === 'ENGINE') return true;
      if (
        (gUpper === 'PT-PPM' || gUpper === 'POWER TRAIN' || gUpper === 'PPM') &&
        (targetComp === 'PT-PPM' || targetComp === 'POWER TRAIN' || targetComp === 'PPM')
      ) {
        return true;
      }
      return gUpper === targetComp;
    });
  }

  return true;
}
