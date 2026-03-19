<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReturnEvidence extends Model
{
    public $timestamps = false; // chỉ có created_at
    public $table = 'return_evidences';

    protected $fillable = [
        'product_return_id',
        'file_path',
        'file_type',
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];

    // Thuộc về yêu cầu hoàn trả
    public function productReturn()
    {
        return $this->belongsTo(ProductReturn::class, 'product_return_id');
    }
}
