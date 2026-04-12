<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Http\Requests\Profile\UpdateProfileRequest;
use Illuminate\Http\Request;
use App\Http\Resources\UserResource;
use Illuminate\Support\Facades\Storage;

class ProfileController extends Controller
{
    public function show(Request $request)
    {
        $user = $request->user()->load(['addresses', 'role']);
        return response()->json([
            'status' => true,
            'data' => new UserResource($user)
        ]);
    }

    public function update(UpdateProfileRequest $request)
    {
        $user = $request->user();
        $data = $request->validated();

        // Xử lý upload avatar nếu có file
        if ($request->hasFile('avatar')) {
            // Xóa avatar cũ nếu có
            if ($user->avatar) {
                $oldPath = str_replace('/storage/', '', $user->avatar);
                Storage::disk('public')->delete($oldPath);
            }

            $path = $request->file('avatar')->store('avatars', 'public');
            $data['avatar'] = '/storage/' . $path;
        }

        // Loại bỏ avatar khỏi data nếu không gửi file (tránh ghi đè null)
        if (!$request->hasFile('avatar') && !isset($data['avatar'])) {
            unset($data['avatar']);
        }

        $user->update($data);

        return response()->json([
            'status' => true,
            'message' => 'Cập nhật thành công',
            'data' => new UserResource($user)
        ]);
    }
}