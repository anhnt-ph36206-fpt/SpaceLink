<?php

namespace App\Http\Requests\Admin\Order;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePaymentStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'payment_status' => 'required|in:unpaid,paid,refunded,partial_refund',
            'note'           => 'nullable|string|max:500',
        ];
    }

    public function messages(): array
    {
        return [
            'payment_status.required' => 'Trạng thái thanh toán không được để trống.',
            'payment_status.in'       => 'Trạng thái thanh toán không hợp lệ.',
        ];
    }
}
