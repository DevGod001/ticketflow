// Local Team Service for Development
class LocalTeamService {
  constructor() {
    this.STORAGE_KEY = 'ticketflow_teams';
    this.initializeStorage();
  }

  initializeStorage() {
    if (!localStorage.getItem(this.STORAGE_KEY)) {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify({}));
    }
  }

  // Get all teams from localStorage
  getTeams() {
    return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');
  }

  // Save teams to localStorage
  saveTeams(teams) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(teams));
  }

  // Generate unique ID
  generateId() {
    return 'team_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Create team
  async create(teamData) {
    const teams = this.getTeams();
    const id = this.generateId();
    
    const newTeam = {
      id,
      ...teamData,
      created_date: new Date().toISOString(),
      updated_date: new Date().toISOString(),
      members: teamData.members || []
    };

    teams[id] = newTeam;
    this.saveTeams(teams);
    
    return { ...newTeam };
  }

  // Get team by ID
  async get(id) {
    const teams = this.getTeams();
    const team = teams[id];
    
    if (!team) {
      throw new Error('Team not found');
    }
    
    return { ...team };
  }

  // Filter teams
  async filter(query = {}, sort = null, limit = null) {
    const teams = this.getTeams();
    let results = Object.values(teams);

    // Apply filters
    if (query.organization_id) {
      results = results.filter(team => team.organization_id === query.organization_id);
    }
    
    if (query.name) {
      results = results.filter(team => 
        team.name.toLowerCase().includes(query.name.toLowerCase())
      );
    }

    if (query.department_id) {
      results = results.filter(team => team.department_id === query.department_id);
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

  // Update team
  async update(id, updates) {
    const teams = this.getTeams();
    const team = teams[id];
    
    if (!team) {
      throw new Error('Team not found');
    }

    const updatedTeam = {
      ...team,
      ...updates,
      updated_date: new Date().toISOString()
    };

    teams[id] = updatedTeam;
    this.saveTeams(teams);
    
    return { ...updatedTeam };
  }

  // Delete team
  async delete(id) {
    const teams = this.getTeams();
    
    if (!teams[id]) {
      throw new Error('Team not found');
    }

    delete teams[id];
    this.saveTeams(teams);
    
    return { success: true };
  }
}

export const LocalTeam = new LocalTeamService();
