<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Http\Requests\Profile\UpdateProfileRequest;
use Illuminate\Http\Request;
use App\Http\Resources\UserResource;

class ProfileController extends Controller
{   public function show(Request $request)
    {
        $user = $request->user()->load(['addresses', 'role']);
        return response()->json([
            'status' => true,
            'data' => new UserResource($user)
        ]);
    }    public function update(UpdateProfileRequest $request)
    {
        $user = $request->user();
        
        // Dùng validated() để bảo mật, chỉ lấy các trường đã cho phép
        $user->update($request->validated());

        return response()->json([
            'status' => true,
            'message' => 'Cập nhật thành công',
            'data' => new UserResource($user)
        ]);
    }
}