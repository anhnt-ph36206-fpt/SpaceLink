<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class AddToCartRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Cart hỗ trợ cả guest lẫn user đăng nhập
    }

    public function rules(): array
    {
        return [
            'variant_id' => 'required|integer|exists:product_variants,id',
            'quantity'   => 'required|integer|min:1|max:100',
            'session_id' => 'nullable|string|max:255',
        ];
    }

    public function messages(): array
    {
        return [
            'variant_id.required' => 'Vui lòng chọn biến thể sản phẩm.',
            'variant_id.exists'   => 'Biến thể sản phẩm không tồn tại.',
            'quantity.required'   => 'Vui lòng nhập số lượng.',
            'quantity.min'        => 'Số lượng tối thiểu là 1.',
            'quantity.max'        => 'Số lượng tối đa mỗi lần là 100.',
        ];
    }

    /**
     * Trả về JSON thay vì redirect khi validation fail (dành cho API).
     */
    protected function failedValidation(Validator $validator): void
    {
        throw new HttpResponseException(
            response()->json([
                'status'  => 'error',
                'message' => 'Dữ liệu không hợp lệ.',
                'errors'  => $validator->errors(),
            ], 422)
        );
    }
}
