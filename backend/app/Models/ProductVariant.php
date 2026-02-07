<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProductVariant extends Model {
    use HasFactory;
    protected $fillable = ['product_id', 'sku', 'price', 'sale_price', 'quantity', 'image', 'is_active'];

    // Liên kết n-n với Attribute qua bảng trung gian
    public function attributes() {
        return $this->belongsToMany(Attribute::class, 'product_variant_attributes', 'variant_id', 'attribute_id');
    }
}