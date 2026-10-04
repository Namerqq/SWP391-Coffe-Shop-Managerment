export const managerNav = {
  MANAGER: {
    subtitle: 'Quản lý',
    // We already handle manager nav inside ManagerLayout directly to match the distinct styling, 
    // but we can register it here if we want to use the common registry.
    // For now, ManagerLayout handles its own navigation, but we define the home path here.
    items: [] 
  }
}

export const managerHomes = { MANAGER: '/manager' }
