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
        return true; // Đã xác thực qua middleware auth:sanctum ở route
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'fullname'      => 'required|string|max:150',
            'phone'         => 'required|string|max:20',
            'province'      => 'required|string|max:100',
            'district'      => 'required|string|max:100',
            'ward'          => 'required|string|max:100',
            'address_detail'=> 'required|string|max:255', // Đúng tên cột trong DB
            'is_default'    => 'boolean',
            'address_type'  => 'nullable|in:home,office,other',
        ];
    }

    public function messages(): array
    {
        return [
            'fullname.required'       => 'Vui lòng nhập họ tên.',
            'phone.required'          => 'Vui lòng nhập số điện thoại.',
            'province.required'       => 'Vui lòng chọn tỉnh/thành phố.',
            'district.required'       => 'Vui lòng chọn quận/huyện.',
            'ward.required'           => 'Vui lòng chọn phường/xã.',
            'address_detail.required' => 'Vui lòng nhập địa chỉ chi tiết.',
        ];
    }
}
