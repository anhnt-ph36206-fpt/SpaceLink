<?php

namespace App\Http\Requests\Profile;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProfileRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
{
    return [
        'fullname' => 'required|string|max:150',
        'phone'    => 'nullable|string|max:20',
        'gender'   => 'nullable|in:male,female,other',
        'date_of_birth' => 'nullable|date',
        'avatar'   => 'nullable|string', // Tạm thời để string (URL), sau này xử lý upload file sau
    ];
}
}
