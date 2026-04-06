<?php

namespace App\Policies;

use App\Models\Product;
use App\Models\User;

class ProductPolicy
{
    /**
     * Admin và Staff đều có thể xem, tạo, cập nhật sản phẩm.
     */
    public function viewAny(User $user): bool
    {
        return in_array($user->role_id, [User::ROLE_ADMIN, User::ROLE_STAFF], true);
    }

    public function view(User $user, Product $product): bool
    {
        return in_array($user->role_id, [User::ROLE_ADMIN, User::ROLE_STAFF], true);
    }

    public function create(User $user): bool
    {
        return in_array($user->role_id, [User::ROLE_ADMIN, User::ROLE_STAFF], true);
    }

    public function update(User $user, Product $product): bool
    {
        return in_array($user->role_id, [User::ROLE_ADMIN, User::ROLE_STAFF], true);
    }

    /**
     * Xóa mềm (SoftDelete) — Admin VÀ Staff đều được phép.
     */
    public function delete(User $user, Product $product): bool
    {
        return in_array($user->role_id, [User::ROLE_ADMIN, User::ROLE_STAFF], true);
    }

    /**
     * Xóa vĩnh viễn (forceDelete) — CHỈ Admin.
     */
    public function forceDelete(User $user, Product $product): bool
    {
        return $user->role_id === User::ROLE_ADMIN;
    }

    /**
     * Khôi phục sản phẩm đã xóa mềm (restore) — CHỈ Admin.
     */
    public function restore(User $user, Product $product): bool
    {
        return $user->role_id === User::ROLE_ADMIN;
    }
}
