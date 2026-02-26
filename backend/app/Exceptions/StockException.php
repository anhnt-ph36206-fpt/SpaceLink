<?php

namespace App\Exceptions;

/**
 * StockException — ném khi có lỗi nghiệp vụ liên quan đến:
 * - Tồn kho không đủ
 * - Sản phẩm không còn bán
 * - Voucher không hợp lệ / hết hạn / hết lượt
 *
 * Controller sẽ catch riêng exception này và trả về HTTP 409 Conflict.
 * Các lỗi hệ thống khác (\Exception) sẽ trả về 500.
 */
class StockException extends \RuntimeException
{
    public function __construct(string $message, int $code = 0, ?\Throwable $previous = null)
    {
        parent::__construct($message, $code, $previous);
    }
}
