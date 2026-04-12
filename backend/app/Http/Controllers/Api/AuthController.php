<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Validator;
use App\Http\Resources\UserResource;

class AuthController extends Controller
{    public function register(Request $request)
{
    $validator = Validator::make($request->all(), [
        'fullname' => 'required|string|max:150',
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
        'fullname' => $request->fullname,
        'email'    => $request->email,
        'password' => Hash::make($request->password),
        'phone'    => $request->phone,
        'status'   => User::STATUS_ACTIVE,
        'role_id'  => User::ROLE_CUSTOMER,
    ]);

    $token = $user->createToken('auth_token')->plainTextToken;

    $user->load('role');

    return response()->json([
        'status'  => 'success',
        'message' => 'Đăng ký thành công',
        'data'    => [
            'user'       => new UserResource($user),
            'token'      => $token,
            'token_type' => 'Bearer',
        ],
    ], 201);
}    public function login(Request $request)
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

        $user->load('role');

        return response()->json([
            'status'  => 'success',
            'message' => 'Đăng nhập thành công',
            'data'    => [
                'user'       => new UserResource($user),
                'token'      => $token,
                'token_type' => 'Bearer',
            ],
        ]);
    }    public function me(Request $request)
    {
        $user = $request->user()->load(['role', 'addresses']);

        return response()->json([
            'status'  => 'success',
            'message' => 'Lấy dữ liệu thành công',
            'data'    => [
                'user' => new UserResource($user),
            ],
        ]);
    }    public function logout(Request $request)
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
    public function forgotPassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email|exists:users,email,deleted_at,NULL',
        ], [
            'email.required' => 'Vui lòng nhập địa chỉ email.',
            'email.email'    => 'Địa chỉ email không đúng định dạng.',
            'email.exists'   => 'Email này không tồn tại hoặc tài khoản đã bị vô hiệu hóa.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Dữ liệu không hợp lệ.',
                'errors'  => $validator->errors(),
            ], 422);
        }

        try {
            $status = Password::sendResetLink(['email' => $request->email]);

            if ($status === Password::RESET_LINK_SENT) {
                return response()->json([
                    'status'  => 'success',
                    'message' => 'Đã gửi link đặt lại mật khẩu về email của bạn. Vui lòng kiểm tra hộp thư.',
                ], 200);
            }

            return response()->json([
                'status'  => 'error',
                'message' => 'Không thể gửi email lúc này. Vui lòng thử lại sau.',
            ], 500);

        } catch (\Exception $e) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Đã xảy ra lỗi hệ thống: ' . $e->getMessage(),
            ], 500);
        }
    }

    // =========================================================================
    // POST /api/auth/reset-password — Đặt lại mật khẩu với token
    // =========================================================================
    public function resetPassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'token'    => 'required|string',
            'email'    => 'required|email|exists:users,email',
            'password' => 'required|string|min:6|confirmed',
        ], [
            'token.required'    => 'Token là bắt buộc.',
            'email.required'    => 'Vui lòng nhập email.',
            'email.exists'      => 'Email không tồn tại.',
            'password.required' => 'Vui lòng nhập mật khẩu mới.',
            'password.min'      => 'Mật khẩu phải có ít nhất 6 ký tự.',
            'password.confirmed'=> 'Xác nhận mật khẩu không khớp.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Dữ liệu không hợp lệ.',
                'errors'  => $validator->errors(),
            ], 422);
        }

        try {
            $status = Password::reset(
                $request->only('email', 'password', 'password_confirmation', 'token'),
                function (User $user, string $password) {
                    $user->forceFill(['password' => Hash::make($password)])->save();
                    // Revoke tất cả tokens cũ để đảm bảo bảo mật
                    $user->tokens()->delete();
                }
            );

            if ($status === Password::PASSWORD_RESET) {
                return response()->json([
                    'status'  => 'success',
                    'message' => 'Đặt lại mật khẩu thành công. Bây giờ bạn có thể đăng nhập bằng mật khẩu mới.',
                ], 200);
            }

            return response()->json([
                'status'  => 'error',
                'message' => 'Token không hợp lệ hoặc đã hết hạn.',
            ], 400);

        } catch (\Exception $e) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Đã xảy ra lỗi khi đặt lại mật khẩu: ' . $e->getMessage(),
            ], 500);
        }
    }

    // =========================================================================
    // POST /api/auth/change-password — Đổi mật khẩu (khi đã login)
    // =========================================================================
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
            ], 422);
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