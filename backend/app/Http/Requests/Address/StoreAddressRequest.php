<?php

namespace App\Http\Requests\Address;

use Illuminate\Foundation\Http\FormRequest;

class StoreAddressRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
{
    return [
        'fullname' => 'required|string|max:100',
        'phone' => 'required|string|max:20',
        'province' => 'required|string|max:100',
        'district' => 'required|string|max:100',
        'ward' => 'required|string|max:100',
        'detail_address' => 'required|string|max:255',
        'is_default' => 'boolean',
    ];
}
}
