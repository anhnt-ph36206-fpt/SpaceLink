<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class CheckoutRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'shipping_address_id' => 'required_without_all:fullname,phone,province,ward,address_detail|nullable|integer|exists:user_addresses,id',
            'payment_method'      => 'required|string|in:cod,vnpay,momo,bank_transfer',
            'voucher_code'        => 'nullable|string|max:50',
            'note'                => 'nullable|string|max:500',
            
            'fullname'            => 'required_without:shipping_address_id|nullable|string|max:255',
            'phone'               => 'required_without:shipping_address_id|nullable|string|max:20',
            'email'               => 'required_without:shipping_address_id|nullable|email|max:255',
            'province'            => 'required_without:shipping_address_id|nullable|string|max:255',
            'district'            => 'nullable|string|max:255',
            'ward'                => 'required_without:shipping_address_id|nullable|string|max:255',
            'address_detail'      => 'required_without:shipping_address_id|nullable|string|max:500',

            'items'               => 'nullable|array',
            'items.*.variant_id'  => 'required_with:items|integer|exists:product_variants,id',
            'items.*.quantity'    => 'required_with:items|integer|min:1',
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
