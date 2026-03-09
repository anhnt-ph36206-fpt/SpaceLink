export interface User {
  id: number | string;
  fullname: string;        // backend trả về 'fullname' (map từ fullname)
  email: string;
  phone?: string;
  gender?: string;
  avatar?: string;
  status: string;      // 'active' | 'banned' | 'inactive'
  role?: string;       // tên role: 'admin' | 'customer' v.v.
  addresses?: unknown[];
  joined_at?: string;
}
