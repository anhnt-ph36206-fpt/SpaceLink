<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class SearchRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'q'           => 'required|string|min:2|max:255',
            'type'        => 'nullable|string|in:products,news,all',
            'category_id' => 'nullable|integer|exists:categories,id',
            'brand_id'    => 'nullable|integer|exists:brands,id',
            'min_price'   => 'nullable|numeric|min:0',
            'max_price'   => 'nullable|numeric|min:0|gte:min_price',
            'sort_by'     => 'nullable|string|in:latest,price_asc,price_desc,relevance',
            'per_page'    => 'nullable|integer|min:1|max:50',
        ];
    }

    public function messages(): array
    {
        return [
            'q.required'      => 'Vui lòng nhập từ khóa tìm kiếm.',
            'q.min'           => 'Từ khóa tìm kiếm phải có ít nhất 2 ký tự.',
            'type.in'         => 'Loại tìm kiếm không hợp lệ (products, news, all).',
            'max_price.gte'   => 'Giá tối đa phải lớn hơn hoặc bằng giá tối thiểu.',
            'per_page.max'    => 'Số kết quả mỗi trang tối đa là 50.',
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
