<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model {
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'category_id', 'brand_id', 'name', 'slug', 'sku', 
        'thumbnail', 'description', 'content', 'price', 
        'sale_price', 'quantity', 'sold_count', 'view_count',
        'is_featured', 'is_active', 'meta_title', 'meta_description'
    ];

    // Relationships
    public function category() { return $this->belongsTo(Category::class); }
    public function brand() { return $this->belongsTo(Brand::class); }
    public function images() { return $this->hasMany(ProductImage::class)->orderBy('display_order'); }
    public function variants() { return $this->hasMany(ProductVariant::class); }
}