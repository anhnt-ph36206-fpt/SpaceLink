<?php

namespace App\Http\Requests\Admin\Shipping;

use Illuminate\Foundation\Http\FormRequest;

class UpdateShippingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $id = $this->route('shipping');
        
        return [
            'name'      => 'nullable|string|max:255',
            'code'      => 'nullable|string|max:50|unique:shippings,code,' . $id,
            'logo'      => 'nullable|image|mimes:jpeg,png,jpg,gif,svg,webp|max:2048',
            'base_fee'  => 'nullable|numeric|min:0',
            'is_active' => 'nullable|boolean',
        ];
    }
}
