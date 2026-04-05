<?php

namespace App\Http\Requests\Admin\User;

use Illuminate\Foundation\Http\FormRequest;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'fullname' => 'required|string|max:150',
            'email'    => 'required|string|email|max:255|unique:users,email',
            'password' => 'required|string|min:6',
            'phone'    => 'nullable|string|max:20',
            'role_id'  => 'sometimes|integer|in:1,3',
            'status'   => 'sometimes|in:active,inactive,banned',
        ];
    }

    public function messages(): array
    {
        return [
            'fullname.required' => 'Họ tên là bắt buộc.',
            'email.required'    => 'Email là bắt buộc.',
            'email.unique'      => 'Email này đã được sử dụng.',
            'password.required' => 'Mật khẩu là bắt buộc.',
            'password.min'      => 'Mật khẩu phải có ít nhất 6 ký tự.',
            'role_id.in'        => 'role_id không hợp lệ (1=Admin, 3=Customer).',
            'status.in'         => 'status không hợp lệ (active, inactive, banned).',
        ];
    }
}
