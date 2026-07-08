const config = require('../config/config');

/**
 * Assigns reporting relationships to all employees.
 * Modifies the employees array in place.
 * 
 * Rules:
 * 1. Every employee reports to a valid manager (except the top VP/Director of Engineering).
 * 2. Each manager manages between 6 and 12 employees (MIN_REPORTS and MAX_REPORTS).
 * 3. No circular reporting hierarchy.
 */
function generateHierarchy(employees) {
  const minReports = config.MIN_REPORTS || 6;
  const maxReports = config.MAX_REPORTS || 12;

  // Separate managers and individual contributors
  const managers = employees.filter(e => e.designation === 'Engineering Manager');
  const icEmployees = employees.filter(e => e.designation !== 'Engineering Manager');

  if (managers.length === 0) {
    throw new Error('Cannot generate hierarchy: No employees with "Engineering Manager" designation.');
  }

  // 1. Establish the manager tree
  // Sort managers (could be by experience to make the hierarchy realistic: most experienced at the top)
  managers.sort((a, b) => b.experience - a.experience);

  const rootManager = managers[0];
  rootManager.managerId = '00000000-0000-0000-0000-000000000000';
  rootManager.managerName = 'Board of Directors';

  // Map to track direct reports for each manager
  // Key: managerId, Value: array of employee objects
  const reportsMap = {};
  managers.forEach(m => {
    reportsMap[m.employeeId] = [];
  });

  // We assign remaining managers to parent managers in a BFS tree structure
  const activeManagers = [rootManager];
  let activeIndex = 0;

  for (let i = 1; i < managers.length; i++) {
    const currentManager = managers[i];
    let assigned = false;

    while (activeIndex < activeManagers.length) {
      const parent = activeManagers[activeIndex];
      const currentReportsCount = reportsMap[parent.employeeId].length;

      // Assign to parent if it has room (under maxReports)
      // To leave room for ICs, we limit child managers reporting to a single manager to 8
      if (currentReportsCount < Math.min(8, maxReports)) {
        currentManager.managerId = parent.employeeId;
        currentManager.managerName = parent.name;
        reportsMap[parent.employeeId].push(currentManager);
        activeManagers.push(currentManager);
        assigned = true;
        break;
      } else {
        activeIndex++;
      }
    }

    // Fallback if queue runs out (should not happen in BFS)
    if (!assigned) {
      currentManager.managerId = rootManager.employeeId;
      currentManager.managerName = rootManager.name;
      reportsMap[rootManager.employeeId].push(currentManager);
    }
  }

  // 2. Distribute Individual Contributors (ICs)
  // We want to assign each IC to a manager such that all managers end up with [minReports, maxReports] reports.
  // We will greedily assign ICs to the manager who currently has the fewest reports AND has room.
  for (const ic of icEmployees) {
    // Find manager with fewest reports who has room
    let bestManager = null;
    let minReportsFound = Infinity;

    for (const mgr of managers) {
      const reportsCount = reportsMap[mgr.employeeId].length;
      if (reportsCount < maxReports && reportsCount < minReportsFound) {
        minReportsFound = reportsCount;
        bestManager = mgr;
      }
    }

    if (!bestManager) {
      // Fallback: if all managers are somehow full, assign to the last manager or root
      bestManager = managers[managers.length - 1];
    }

    ic.managerId = bestManager.employeeId;
    ic.managerName = bestManager.name;
    reportsMap[bestManager.employeeId].push(ic);
  }

  // 3. Validation and Adjustment
  // Check if any manager has fewer than minReports. If so, rebalance.
  // (In a standard scale of 10% managers, this will naturally be satisfied, but we write a robust check).
  managers.forEach(mgr => {
    const count = reportsMap[mgr.employeeId].length;
    if (count < minReports && managers.length > 1) {
      // Find a manager with > minReports and reassign one of their IC reports to this mgr
      const overfilledMgr = managers.find(m => reportsMap[m.employeeId].length > minReports);
      if (overfilledMgr) {
        // Find an IC in the overfilled manager's reports
        const icIndex = reportsMap[overfilledMgr.employeeId].findIndex(e => e.designation !== 'Engineering Manager');
        if (icIndex !== -1) {
          const icToMove = reportsMap[overfilledMgr.employeeId].splice(icIndex, 1)[0];
          icToMove.managerId = mgr.employeeId;
          icToMove.managerName = mgr.name;
          reportsMap[mgr.employeeId].push(icToMove);
        }
      }
    }
  });

  return employees;
}

module.exports = {
  generateHierarchy
};
