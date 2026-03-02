<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class CheckoutRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Chỉ user đã đăng nhập mới được checkout
        return auth('sanctum')->check();
    }

    public function rules(): array
    {
        return [
            'shipping_address_id' => 'required|integer|exists:user_addresses,id',
            'payment_method'      => 'required|string|in:cod,vnpay,momo,bank_transfer',
            'voucher_code'        => 'nullable|string|max:50',
            'note'                => 'nullable|string|max:500',
        ];
    }

    public function messages(): array
    {
        return [
            'shipping_address_id.required' => 'Vui lòng chọn địa chỉ giao hàng.',
            'shipping_address_id.exists'   => 'Địa chỉ giao hàng không tồn tại.',
            'payment_method.required'      => 'Vui lòng chọn phương thức thanh toán.',
            'payment_method.in'            => 'Phương thức thanh toán không hợp lệ. Chấp nhận: cod, vnpay, momo, bank_transfer.',
            'voucher_code.max'             => 'Mã voucher tối đa 50 ký tự.',
            'note.max'                     => 'Ghi chú tối đa 500 ký tự.',
        ];
    }

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
