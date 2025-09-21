// Local Department Service for Development
class LocalDepartmentService {
  constructor() {
    this.STORAGE_KEY = 'ticketflow_departments';
    this.initializeStorage();
  }

  initializeStorage() {
    if (!localStorage.getItem(this.STORAGE_KEY)) {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify({}));
    }
  }

  // Get all departments from localStorage
  getDepartments() {
    return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');
  }

  // Save departments to localStorage
  saveDepartments(departments) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(departments));
  }

  // Generate unique ID
  generateId() {
    return 'dept_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Create department
  async create(departmentData) {
    const departments = this.getDepartments();
    const id = this.generateId();
    
    const newDepartment = {
      id,
      ...departmentData,
      created_date: new Date().toISOString(),
      updated_date: new Date().toISOString(),
      members: departmentData.members || []
    };

    departments[id] = newDepartment;
    this.saveDepartments(departments);
    
    return { ...newDepartment };
  }

  // Get department by ID
  async get(id) {
    const departments = this.getDepartments();
    const department = departments[id];
    
    if (!department) {
      throw new Error('Department not found');
    }
    
    return { ...department };
  }

  // Filter departments
  async filter(query = {}, sort = null, limit = null) {
    const departments = this.getDepartments();
    let results = Object.values(departments);

    // Apply filters
    if (query.organization_id) {
      results = results.filter(dept => dept.organization_id === query.organization_id);
    }
    
    if (query.name) {
      results = results.filter(dept => 
        dept.name.toLowerCase().includes(query.name.toLowerCase())
      );
    }

    // Apply sorting
    if (sort) {
      const sortField = sort.startsWith('-') ? sort.substring(1) : sort;
      const sortOrder = sort.startsWith('-') ? -1 : 1;
      
      results.sort((a, b) => {
        const aVal = a[sortField];
        const bVal = b[sortField];
        
        if (aVal < bVal) return -1 * sortOrder;
        if (aVal > bVal) return 1 * sortOrder;
        return 0;
      });
    }

    // Apply limit
    if (limit) {
      results = results.slice(0, limit);
    }

    return results;
  }

  // Update department
  async update(id, updates) {
    const departments = this.getDepartments();
    const department = departments[id];
    
    if (!department) {
      throw new Error('Department not found');
    }

    const updatedDepartment = {
      ...department,
      ...updates,
      updated_date: new Date().toISOString()
    };

    departments[id] = updatedDepartment;
    this.saveDepartments(departments);
    
    return { ...updatedDepartment };
  }

  // Delete department
  async delete(id) {
    const departments = this.getDepartments();
    
    if (!departments[id]) {
      throw new Error('Department not found');
    }

    delete departments[id];
    this.saveDepartments(departments);
    
    return { success: true };
  }
}

export const LocalDepartment = new LocalDepartmentService();
