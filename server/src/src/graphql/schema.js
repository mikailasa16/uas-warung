// Skema GraphQL: satu endpoint /graphql untuk semua fitur (login, produk, kasir, laporan).
export const typeDefs = `
  enum Role {
    admin
    operator
  }

  type User {
    id: ID!
    username: String!
    name: String!
    role: Role!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type Category {
    id: ID!
    categoryName: String!
    productCount: Int!
  }

  type Product {
    id: ID!
    categoryId: ID!
    barcode: String
    productName: String!
    "Harga beli: hanya terlihat oleh admin (kasir mendapat null)"
    costPrice: Float
    sellingPrice: Float!
    stock: Int!
    category: Category!
  }

  type TransactionDetail {
    id: ID!
    quantity: Int!
    unitPrice: Float!
    subtotal: Float!
    product: Product!
  }

  type Transaction {
    id: ID!
    transactionNumber: String!
    totalAmount: Float!
    paymentAmount: Float!
    changeAmount: Float!
    createdAt: String!
    user: User!
    details: [TransactionDetail!]!
  }

  type DayRevenue {
    date: String!
    revenue: Float!
  }

  type Dashboard {
    todayRevenue: Float!
    todayTransactions: Int!
    lowStockCount: Int!
    lowStockProducts: [Product!]!
    last7Days: [DayRevenue!]!
  }

  type ReportSummary {
    count: Int!
    revenue: Float!
  }

  type Report {
    period: String!
    from: String!
    to: String!
    summary: ReportSummary!
    items: [Transaction!]!
  }

  input ProductInput {
    categoryId: ID!
    barcode: String
    productName: String!
    costPrice: Float!
    sellingPrice: Float!
    stock: Int!
  }

  input CartItemInput {
    productId: ID!
    quantity: Int!
  }

  type Query {
    health: String!
    "Data user yang sedang login"
    me: User!
    categories: [Category!]!
    products(search: String, categoryId: ID): [Product!]!
    productByBarcode(barcode: String!): Product!
    "Transaksi milik user yang login, hari ini"
    myTransactions: [Transaction!]!
    "Khusus admin"
    dashboard: Dashboard!
    "Khusus admin. period: daily atau monthly, date: YYYY-MM-DD"
    report(period: String, date: String): Report!
  }

  type Mutation {
    login(username: String!, password: String!): AuthPayload!

    "Khusus admin"
    createCategory(categoryName: String!): Category!
    updateCategory(id: ID!, categoryName: String!): Category!
    deleteCategory(id: ID!): Boolean!
    createProduct(input: ProductInput!): Product!
    updateProduct(id: ID!, input: ProductInput!): Product!
    deleteProduct(id: ID!): Boolean!

    "Admin dan kasir: stok berkurang otomatis, kembalian dihitung server"
    checkout(items: [CartItemInput!]!, paymentAmount: Float!): Transaction!
  }
`;
