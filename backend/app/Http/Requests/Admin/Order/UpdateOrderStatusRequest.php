<?php

namespace App\Http\Requests\Admin\Order;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

class UpdateOrderStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'status'             => 'required|in:pending,confirmed,processing,shipping,delivered,completed,cancelled,returned',
            'note'               => 'nullable|string|max:500',
            'cancelled_reason'   => 'required_if:status,cancelled|nullable|string|max:500',
            'tracking_code'      => 'nullable|string|max:100',
            'shipping_partner'   => 'nullable|string|max:100',
            'estimated_delivery' => 'nullable|date',
        ];
    }

    public function messages(): array
    {
        return [
            'status.required'              => 'Trạng thái không được để trống.',
            'status.in'                    => 'Trạng thái không hợp lệ.',
            'cancelled_reason.required_if' => 'Vui lòng nhập lý do hủy đơn.',
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
