<?php

namespace App\Http\Requests\Admin\Product;

use Illuminate\Foundation\Http\FormRequest;

class StoreVariantRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'sku'        => 'nullable|string|max:100|unique:product_variants,sku',
            'price'      => 'required|numeric|min:0',
            'sale_price' => 'nullable|numeric|min:0|lt:price',
            'quantity'   => 'nullable|integer|min:0',
            'image'      => 'nullable|string|max:255',
            'is_active'  => 'nullable|boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'sku.unique'      => 'SKU variant này đã tồn tại.',
            'price.required'  => 'Giá variant không được để trống.',
            'sale_price.lt'   => 'Giá khuyến mãi phải nhỏ hơn giá gốc.',
        ];
    }
}
