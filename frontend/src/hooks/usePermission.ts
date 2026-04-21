import { useAuth } from '../context/AuthContext';

/**
 * usePermission — Hook kiểm tra quyền thao tác theo Role.
 *
 * Cách dùng:
 *   const { canDelete, isAdmin, isStaff } = usePermission();
 *   {canDelete && <Button danger .../>}
 */
export const usePermission = () => {
    const { isAdmin, isStaff } = useAuth();

    return {
        /** Chỉ Admin mới được thực hiện xóa vĩnh viễn (hard delete) */
        canDelete: isAdmin,

        /** Admin + Staff đều được ẩn (soft action: toggle is_active / is_hidden) */
        canToggleVisibility: isAdmin || isStaff,

        /** Admin + Staff đều được thêm/sửa nội dung */
        canCreate: isAdmin || isStaff,
        canUpdate: isAdmin || isStaff,

        /** Admin + Staff đều được xem dữ liệu */
        canView: isAdmin || isStaff,

        /** Chỉ Admin xem báo cáo doanh thu chi tiết */
        canViewRevenue: isAdmin,

        /** Chỉ Admin quản lý người dùng & phân quyền */
        canManageUsers: isAdmin,

        isAdmin,
        isStaff,
    };
};
