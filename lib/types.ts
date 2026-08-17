export interface User {
  _id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: 'user' | 'admin';
  isEmailVerified: boolean;
  createdAt: string;
}

export interface CategoryImage {
  public_id: string;
  url: string;
}

export interface Category {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  image?: CategoryImage;
  createdAt: string;
}

export interface SubCategory {
  _id: string;
  name: string;
  category: Category | string;
  description?: string;
  isActive: boolean;
  image?: CategoryImage;
}

export interface ProductImage {
  public_id: string;
  url: string;
}

export interface ProductSpecification {
  key: string;
  value: string;
}

export interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  mrp: number;
  discount: number;
  brand?: string;
  highlights: string[];
  specifications: ProductSpecification[];
  images: ProductImage[];
  category: Category | string;
  subCategory?: SubCategory | string;
  stock: number;
  isActive: boolean;
  ratings: { average: number; count: number };
  createdAt: string;
}

export interface OrderItem {
  product: Product | string;
  quantity: number;
  price: number;
}

export interface ShippingAddress {
  fullName: string;
  phone: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
}

export interface Order {
  _id: string;
  user: User | string;
  orderItems: OrderItem[];
  shippingAddress: ShippingAddress;
  paymentMethod: 'razorpay' | 'cod';
  paymentStatus: 'pending' | 'paid' | 'failed';
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;
}

export interface OfferImage {
  public_id: string;
  url: string;
}

export interface Offer {
  _id: string;
  title: string;
  description: string;
  image?: OfferImage;
  discountPercentage: number;
  isActive: boolean;
  validUntil: string;
  applicableCategory?: Category | string;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  status: string;
  results: number;
  total: number;
  page: number;
  pages: number;
  data: Record<string, T[]>;
}

export interface ApiResponse<T> {
  status: string;
  data: Record<string, T>;
  message?: string;
  token?: string;
}
