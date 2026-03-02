<?php

namespace App\Http\Requests\Admin\User;

use Illuminate\Foundation\Http\FormRequest;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'fullname'      => 'sometimes|string|max:150',
            'phone'         => 'sometimes|nullable|string|max:15',
            'role_id'       => 'sometimes|integer|in:1,2,3',
            'status'        => 'sometimes|in:active,inactive,banned',
            'gender'        => 'sometimes|nullable|in:male,female,other',
            'date_of_birth' => 'sometimes|nullable|date',
        ];
    }

    public function messages(): array
    {
        return [
            'role_id.in'   => 'role_id không hợp lệ (1=Admin, 2=Staff, 3=Customer).',
            'status.in'    => 'status không hợp lệ (active, inactive, banned).',
            'gender.in'    => 'gender không hợp lệ (male, female, other).',
        ];
    }
}
