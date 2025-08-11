export interface Clique {
  id: string;
  name: string;
  memberCount: number;
  createdAt: Date;
  members: User[];
}

export interface User {
  id: string;
  name: string;
  avatar?: string;
}
