<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use App\Http\Resources\BrandResource;
use Illuminate\Http\Request;

class BrandController extends Controller
{    public function index()
    {
        $brands = Brand::where('is_active', true)
            ->orderBy('display_order', 'asc')
            ->get();

        return BrandResource::collection($brands);
    }
}
