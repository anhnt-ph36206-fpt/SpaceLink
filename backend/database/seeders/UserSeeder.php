<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Role;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Bắt buộc: 1 admin (cứng) + 2 customer (mềm, mẫu test API).
     */
    public function run(): void
    {
        $adminRole    = Role::where('name', 'admin')->first();
        $customerRole = Role::where('name', 'customer')->first();

        if (!$adminRole || !$customerRole) {
            $this->command->warn('Chạy RoleSeeder trước (cần role admin + customer).');
            return;
        }

        User::firstOrCreate(
            ['email' => 'admin@spacelink.test'],
            [
                'role_id'  => $adminRole->id,
                'password' => Hash::make('password'),
                'fullname' => 'Admin SpaceLink',
                'status'   => 'active',
            ]
        );

        User::firstOrCreate(
            ['email' => 'user1@test.com'],
            [
                'role_id'  => $customerRole->id,
                'password' => Hash::make('password'),
                'fullname' => 'Nguyễn Văn A',
                'status'   => 'active',
            ]
        );

        User::firstOrCreate(
            ['email' => 'user2@test.com'],
            [
                'role_id'  => $customerRole->id,
                'password' => Hash::make('password'),
                'fullname' => 'Trần Thị B',
                'status'   => 'active',
            ]
        );
    }
}