<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use App\Http\Resources\UserResource; // Import Resource
use OpenApi\Attributes as OA;

class AuthController extends Controller
{
    #[OA\Post(
        path: '/api/auth/register',
        summary: 'Đăng ký tài khoản mới',
        tags: ['Authentication'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['name', 'email', 'password', 'password_confirmation'],
                properties: [
                    new OA\Property(property: 'name', type: 'string', example: 'Nguyen Van A'),
                    new OA\Property(property: 'email', type: 'string', format: 'email', example: 'user@example.com'),
                    new OA\Property(property: 'password', type: 'string', format: 'password', example: '123456'),
                    new OA\Property(property: 'password_confirmation', type: 'string', format: 'password', example: '123456'),
                    new OA\Property(property: 'phone', type: 'string', example: '0912345678'),
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 201,
                description: 'Đăng ký thành công',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'status', type: 'boolean', example: true),
                        new OA\Property(property: 'message', type: 'string', example: 'Đăng ký thành công'),
                        new OA\Property(property: 'data', type: 'object', properties: [
                            new OA\Property(property: 'user', type: 'object'),
                            new OA\Property(property: 'token', type: 'string', example: '1|abcde...'),
                            new OA\Property(property: 'token_type', type: 'string', example: 'Bearer'),
                        ])
                    ]
                )
            ),
            new OA\Response(response: 422, description: 'Lỗi kiểm tra dữ liệu')
        ]
    )]
    public function register(Request $request)
{
    $validator = Validator::make($request->all(), [
        'name' => 'required|string|max:150',
        'email' => 'required|string|email|max:255|unique:users',
        'password' => 'required|string|min:6|confirmed',
        'phone' => 'nullable|string|max:20', // Không bắt buộc (nullable)
    ]);

    if ($validator->fails()) {
        return response()->json([
            'status' => false,
            'message' => 'Lỗi kiểm tra dữ liệu',
            'errors' => $validator->errors()
        ], 422);
    }

    $user = User::create([
        'fullname' => $request->name,
        'email' => $request->email,
        'password' => Hash::make($request->password),
        'phone' => $request->phone, // Nếu không gửi, DB sẽ tự lưu NULL
        'status' => User::STATUS_ACTIVE,
        'role_id' => User::ROLE_CUSTOMER, // Sẽ lấy giá trị 3 từ hằng số trong Model
    ]);

    $token = $user->createToken('auth_token')->plainTextToken;

    return response()->json([
        'status' => true,
        'message' => 'Đăng ký thành công',
        'data' => [
            'user' => $user,
            'token' => $token,
            'token_type' => 'Bearer'
        ]
    ], 201);
}

    #[OA\Post(
        path: '/api/auth/login',
        summary: 'Đăng nhập hệ thống',
        tags: ['Authentication'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['email', 'password'],
                properties: [
                    new OA\Property(property: 'email', type: 'string', example: 'user@example.com'),
                    new OA\Property(property: 'password', type: 'string', example: '123456'),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Đăng nhập thành công'),
            new OA\Response(response: 401, description: 'Thông tin đăng nhập không chính xác')
        ]
    )]
    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|string|email',
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => false, 
                'message' => 'Dữ liệu không hợp lệ', 
                'errors' => $validator->errors()
            ], 422);
        }

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'status' => false, 
                'message' => 'Thông tin đăng nhập không chính xác'
            ], 401);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'status' => true,
            'message' => 'Đăng nhập thành công',
            'data' => [
                'user' => new UserResource($user), // TỐI ƯU: Dùng Resource
                'token' => $token,
                'token_type' => 'Bearer'
            ]
        ], 200);
    }

    #[OA\Get(
        path: '/api/auth/me',
        summary: 'Lấy thông tin người dùng hiện tại',
        tags: ['Authentication'],
        security: [['sanctum' => []]],
        responses: [
            new OA\Response(response: 200, description: 'Thành công'),
            new OA\Response(response: 401, description: 'Chưa xác thực')
        ]
    )]
    public function me(Request $request)
    {
        // TỐI ƯU: Load thêm role và addresses để trả về đầy đủ info cho Frontend
        $user = $request->user()->load(['role', 'addresses']);

        return response()->json([
            'status' => true,
            'message' => 'Lấy dữ liệu thành công',
            'data' => [
                'user' => new UserResource($user) // TỐI ƯU: Resource sẽ format cả addresses bên trong
            ]
        ], 200);
    }

    #[OA\Post(
        path: '/api/auth/logout',
        summary: 'Đăng xuất tài khoản',
        tags: ['Authentication'],
        security: [['sanctum' => []]],
        responses: [
            new OA\Response(response: 200, description: 'Đăng xuất thành công')
        ]
    )]
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'status' => true,
            'message' => 'Đăng xuất thành công'
        ], 200);
    }
}