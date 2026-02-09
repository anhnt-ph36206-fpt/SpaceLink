<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\UserAddress;
use Illuminate\Database\Seeder;

class UserAddressSeeder extends Seeder
{
    /**
     * Dữ liệu mềm: vài địa chỉ mẫu cho user test (doc 22 - tùy chọn).
     */
    public function run(): void
    {
        $user = User::where('email', 'user1@test.com')->first();
        if (!$user) {
            return;
        }

        UserAddress::firstOrCreate(
            [
                'user_id' => $user->id,
                'address_detail' => 'Số 123 Đường ABC',
            ],
            [
                'fullname'      => 'Nguyễn Văn A',
                'phone'         => '0901234567',
                'province'      => 'Hà Nội',
                'district'      => 'Quận Cầu Giấy',
                'ward'          => 'Phường Dịch Vọng',
                'address_detail'=> 'Số 123 Đường ABC',
                'is_default'    => true,
                'address_type'  => 'home',
            ]
        );
    }
}