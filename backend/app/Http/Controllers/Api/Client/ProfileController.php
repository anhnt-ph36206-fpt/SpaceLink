<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Http\Requests\Profile\UpdateProfileRequest;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;
use App\Http\Resources\UserResource;

class ProfileController extends Controller
{
    #[OA\Get(
        path: '/api/profile',
        summary: 'Lấy thông tin profile và danh sách địa chỉ',
        tags: ['Client - Profile'],
        security: [['sanctum' => []]],
        responses: [
            new OA\Response(response: 200, description: 'Thành công')
        ]
    )]
   public function show(Request $request)
    {
        $user = $request->user()->load(['addresses', 'role']);
        return response()->json([
            'status' => true,
            'data' => new UserResource($user)
        ]);
    }

    #[OA\Put(
        path: '/api/profile',
        summary: 'Cập nhật thông tin cá nhân',
        tags: ['Client - Profile'],
        security: [['sanctum' => []]],
        requestBody: new OA\RequestBody(
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'fullname', type: 'string'),
                    new OA\Property(property: 'phone', type: 'string'),
                    new OA\Property(property: 'gender', type: 'string', enum: ['male', 'female', 'other']),
                    new OA\Property(property: 'date_of_birth', type: 'string', format: 'date'),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Cập nhật thành công')
        ]
    )]
    public function update(UpdateProfileRequest $request)
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