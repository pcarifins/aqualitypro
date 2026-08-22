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
    canViewAnalytics: isSupervisor || isAdmin || isPPC || isQC,
    canManageMasterData: isAdmin || isSupervisor,
  };
}
