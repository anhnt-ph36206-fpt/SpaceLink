<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Validator;
use App\Http\Resources\UserResource;
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
            'status'  => 'error',
            'message' => 'Lỗi kiểm tra dữ liệu',
            'errors'  => $validator->errors()
        ], 422);
    }

    $user = User::create([
        'fullname' => $request->name,
        'email'    => $request->email,
        'password' => Hash::make($request->password),
        'phone'    => $request->phone,
        'status'   => User::STATUS_ACTIVE,
        'role_id'  => User::ROLE_CUSTOMER,
    ]);

    $token = $user->createToken('auth_token')->plainTextToken;

    return response()->json([
        'status'  => 'success',
        'message' => 'Đăng ký thành công',
        'data'    => [
            'user'       => new UserResource($user),
            'token'      => $token,
            'token_type' => 'Bearer',
        ],
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
                'status'  => 'error',
                'message' => 'Dữ liệu không hợp lệ',
                'errors'  => $validator->errors()
            ], 422);
        }

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Email hoặc mật khẩu không chính xác.',
            ], 401);
        }

        // Kiểm tra trạng thái tài khoản
        if ($user->status === User::STATUS_BANNED) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Tài khoản của bạn đã bị cấm. Vui lòng liên hệ hỗ trợ.',
            ], 403);
        }

        if ($user->status === User::STATUS_INACTIVE) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Tài khoản chưa được kích hoạt.',
            ], 403);
        }

        // Cập nhật thời gian đăng nhập
        $user->update(['last_login_at' => now()]);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'status'  => 'success',
            'message' => 'Đăng nhập thành công',
            'data'    => [
                'user'       => new UserResource($user),
                'token'      => $token,
                'token_type' => 'Bearer',
            ],
        ]);
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
        $user = $request->user()->load(['role', 'addresses']);

        return response()->json([
            'status'  => 'success',
            'message' => 'Lấy dữ liệu thành công',
            'data'    => [
                'user' => new UserResource($user),
            ],
        ]);
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
            'status'  => 'success',
            'message' => 'Đăng xuất thành công',
        ]);
    }

    // =========================================================================
    // POST /api/auth/forgot-password — Gửi link đặt lại mật khẩu
    // =========================================================================
    #[OA\Post(
        path: '/api/auth/forgot-password',
        summary: 'Gửi email đặt lại mật khẩu',
        tags: ['Authentication'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['email'],
                properties: [
                    new OA\Property(property: 'email', type: 'string', format: 'email', example: 'user@example.com'),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Link đặt lại mật khẩu đã được gửi'),
            new OA\Response(response: 422, description: 'Email không hợp lệ hoặc không tồn tại'),
        ]
    )]
    public function forgotPassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email|exists:users,email',
        ], [
            'email.exists' => 'Email này không tồn tại trong hệ thống.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Dữ liệu không hợp lệ.',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $status = Password::sendResetLink(['email' => $request->email]);

        if ($status === Password::RESET_LINK_SENT) {
            return response()->json([
                'status'  => 'success',
                'message' => 'Đã gửi link đặt lại mật khẩu về email của bạn.',
            ]);
        }

        return response()->json([
            'status'  => 'error',
            'message' => 'Không thể gửi email. Vui lòng thử lại sau.',
        ], 500);
    }

    // =========================================================================
    // POST /api/auth/reset-password — Đặt lại mật khẩu với token
    // =========================================================================
    #[OA\Post(
        path: '/api/auth/reset-password',
        summary: 'Đặt lại mật khẩu (dùng token từ email)',
        tags: ['Authentication'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['token', 'email', 'password', 'password_confirmation'],
                properties: [
                    new OA\Property(property: 'token',                 type: 'string', description: 'Token từ email đặt lại mật khẩu'),
                    new OA\Property(property: 'email',                 type: 'string', format: 'email'),
                    new OA\Property(property: 'password',              type: 'string', format: 'password', minimum: 6),
                    new OA\Property(property: 'password_confirmation', type: 'string', format: 'password'),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Đặt lại mật khẩu thành công'),
            new OA\Response(response: 422, description: 'Token không hợp lệ hoặc hết hạn'),
        ]
    )]
    public function resetPassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'token'    => 'required|string',
            'email'    => 'required|email|exists:users,email',
            'password' => 'required|string|min:6|confirmed',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Dữ liệu không hợp lệ.',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password) {
                $user->forceFill(['password' => Hash::make($password)])->save();
                $user->tokens()->delete(); // Revoke tất cả tokens cũ
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            return response()->json([
                'status'  => 'success',
                'message' => 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.',
            ]);
        }

        return response()->json([
            'status'  => 'error',
            'message' => 'Token không hợp lệ hoặc đã hết hạn.',
        ], 422);
    }

    // =========================================================================
    // POST /api/auth/change-password — Đổi mật khẩu (khi đã login)
    // =========================================================================
    #[OA\Post(
        path: '/api/auth/change-password',
        summary: 'Đổi mật khẩu khi đã đăng nhập',
        tags: ['Authentication'],
        security: [['sanctum' => []]],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['current_password', 'password', 'password_confirmation'],
                properties: [
                    new OA\Property(property: 'current_password',      type: 'string', format: 'password'),
                    new OA\Property(property: 'password',              type: 'string', format: 'password', minimum: 6),
                    new OA\Property(property: 'password_confirmation', type: 'string', format: 'password'),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Đổi mật khẩu thành công'),
            new OA\Response(response: 401, description: 'Mật khẩu hiện tại không đúng'),
            new OA\Response(response: 422, description: 'Dữ liệu không hợp lệ'),
        ]
    )]
    public function changePassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'current_password' => 'required|string',
            'password'         => 'required|string|min:6|confirmed',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Dữ liệu không hợp lệ.',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $user = $request->user();

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Mật khẩu hiện tại không chính xác.',
            ], 401);
        }

        $user->update(['password' => Hash::make($request->password)]);
        // Revoke tất cả tokens khác (ngoài token hiện tại)
        $user->tokens()->where('id', '!=', $request->user()->currentAccessToken()->id)->delete();

        return response()->json([
            'status'  => 'success',
            'message' => 'Đổi mật khẩu thành công.',
        ]);
    }
}