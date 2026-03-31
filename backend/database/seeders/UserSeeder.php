<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Role;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Dữ liệu cứng: 1 admin, 1 staff (bắt buộc để test đủ roles).
     * Dữ liệu mềm: 2 customer mẫu.
     */
    public function run(): void
    {
        $adminRole    = Role::where('name', 'admin')->first();
        $staffRole    = Role::where('name', 'staff')->first();
        $customerRole = Role::where('name', 'customer')->first();

        if (!$adminRole || !$staffRole || !$customerRole) {
            $this->command->warn('Chạy RoleSeeder trước (cần role admin, staff, customer).');
            return;
        }

        // --- Admin (bắt buộc, không được xoá) ---
        User::firstOrCreate(
            ['email' => 'admin@spacelink.test'],
            [
                'role_id'  => $adminRole->id,
                'password' => Hash::make('123456789'),
                'fullname' => 'Admin SpaceLink Main',
                'status'   => 'active',
            ]
        );

        User::firstOrCreate(
            ['email' => 'admin2@spacelink.test'],
            [
                'role_id'  => $adminRole->id,
                'password' => Hash::make('123456789'),
                'fullname' => 'Admin SpaceLink Sub',
                'status'   => 'active',
            ]
        );

        // --- Staff (để test các tính năng nhân viên) ---
        User::firstOrCreate(
            ['email' => 'staff@spacelink.test'],
            [
                'role_id'  => $staffRole->id,
                'password' => Hash::make('123456789'),
                'fullname' => 'Nhân Viên SpaceLink Main',
                'status'   => 'active',
            ]
        );

        User::firstOrCreate(
            ['email' => 'staff2@spacelink.test'],
            [
                'role_id'  => $staffRole->id,
                'password' => Hash::make('123456789'),
                'fullname' => 'Nhân Viên SpaceLink Sub',
                'status'   => 'active',
            ]
        );

        // --- Customer mẫu ---
        User::firstOrCreate(
            ['email' => 'user1@test.com'],
            [
                'role_id'  => $customerRole->id,
                'password' => Hash::make('123456789'),
                'fullname' => 'Nguyễn Văn A',
                'status'   => 'active',
            ]
        );

        User::firstOrCreate(
            ['email' => 'user2@test.com'],
            [
                'role_id'  => $customerRole->id,
                'password' => Hash::make('123456789'),
                'fullname' => 'Trần Thị B',
                'status'   => 'active',
            ]
        );

        User::firstOrCreate(
            ['email' => 'user3@test.com'],
            [
                'role_id'  => $customerRole->id,
                'password' => Hash::make('123456789'),
                'fullname' => 'Hoàng Văn C',
                'status'   => 'active',
            ]
        );
    }
}