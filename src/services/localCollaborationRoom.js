// Local storage service for collaboration rooms
export class LocalCollaborationRoom {
  static STORAGE_KEY = 'collaboration_rooms';

  static getAll() {
    try {
      const rooms = localStorage.getItem(this.STORAGE_KEY);
      return rooms ? JSON.parse(rooms) : [];
    } catch (error) {
      console.error('Error getting collaboration rooms:', error);
      return [];
    }
  }

  static async filter(criteria = {}) {
    const rooms = this.getAll();
    
    if (Object.keys(criteria).length === 0) {
      return rooms;
    }

    return rooms.filter(room => {
      return Object.entries(criteria).every(([key, value]) => {
        if (key === 'organization_id') {
          return room.organization_id === value;
        }
        if (key === 'member_emails') {
          // Check if user is a member of the room
          return room.member_emails && room.member_emails.includes(value);
        }
        return room[key] === value;
      });
    });
  }

  static async create(roomData) {
    try {
      const rooms = this.getAll();
      const newRoom = {
        id: `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...roomData
      };
      
      rooms.push(newRoom);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(rooms));
      return newRoom;
    } catch (error) {
      console.error('Error creating collaboration room:', error);
      throw error;
    }
  }

  static async update(id, updateData) {
    try {
      const rooms = this.getAll();
      const roomIndex = rooms.findIndex(room => room.id === id);
      
      if (roomIndex === -1) {
        throw new Error('Room not found');
      }

      rooms[roomIndex] = {
        ...rooms[roomIndex],
        ...updateData,
        updated_at: new Date().toISOString()
      };

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(rooms));
      return rooms[roomIndex];
    } catch (error) {
      console.error('Error updating collaboration room:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const rooms = this.getAll();
      const filteredRooms = rooms.filter(room => room.id !== id);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredRooms));
      return true;
    } catch (error) {
      console.error('Error deleting collaboration room:', error);
      throw error;
    }
  }

  static async get(id) {
    const rooms = this.getAll();
    return rooms.find(room => room.id === id) || null;
  }
}
