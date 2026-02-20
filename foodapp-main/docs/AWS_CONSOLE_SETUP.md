# AWS Console Setup (EC2 + RDS + S3 + CloudWatch)

This guide matches the current project architecture (Next.js standalone app + MySQL).

## 1) Target architecture

- `EC2` runs the Next.js app.
- `RDS MySQL` stores application data.
- `S3` stores menu images/static media.
- `CloudWatch` stores app/system logs.
- `AWS Budgets` alerts on cost usage.

## 2) Create cost protection first

1. Open `Billing and Cost Management` -> `Budgets`.
2. Create a monthly `Cost budget` (for example: `USD 5` or `USD 10`).
3. Add email alerts at 80% and 100%.

## 3) Security groups

Create two security groups in the same VPC.

### EC2 SG (`foodapp-ec2-sg`)

- Inbound:
  - TCP `22` from `My IP`
  - TCP `80` from `0.0.0.0/0`
  - TCP `443` from `0.0.0.0/0`
- Outbound: allow all (default).

### RDS SG (`foodapp-rds-sg`)

- Inbound:
  - MySQL/Aurora TCP `3306` from source security group `foodapp-ec2-sg`
- Outbound: allow all (default).

## 4) Create RDS MySQL

1. Open `RDS` -> `Databases` -> `Create database`.
2. Engine: `MySQL`.
3. Template: `Free tier` (if available for your account).
4. DB instance identifier: `foodapp-db`.
5. Master username/password: choose secure values.
6. Connectivity:
   - VPC: same as EC2
   - Public access: `No`
   - VPC security group: `foodapp-rds-sg`
7. Initial DB name: `foodapp`.
8. Create DB and wait for `Available`.
9. Copy endpoint (e.g. `foodapp-db.xxxxx.region.rds.amazonaws.com`).

## 5) Create S3 bucket for images

1. Open `S3` -> `Create bucket`.
2. Bucket name example: `foodapp-assets-<account-id>`.
3. Region: same region as EC2/RDS.
4. Keep `Block Public Access` enabled.
5. Create bucket.

If you need public image delivery, use `CloudFront + Origin Access Control` for secure access instead of making bucket public.

## 6) IAM role for EC2

1. Open `IAM` -> `Roles` -> `Create role`.
2. Trusted entity: `AWS service` -> `EC2`.
3. Attach policies:
   - `AmazonS3ReadOnlyAccess` (or narrower custom bucket policy)
   - `CloudWatchAgentServerPolicy`
4. Role name: `foodapp-ec2-role`.

## 7) Launch EC2 instance

1. Open `EC2` -> `Instances` -> `Launch instance`.
2. AMI: `Amazon Linux 2023`.
3. Instance type: `t3.micro` (or free-tier eligible option in your account).
4. Key pair: create/select one.
5. Network:
   - assign public IP: enabled
   - security group: `foodapp-ec2-sg`
6. Advanced details -> IAM instance profile: `foodapp-ec2-role`.
7. Launch.

## 8) Deploy app on EC2

SSH into EC2 and run:

```bash
sudo dnf update -y
sudo dnf install -y git
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs

git clone <your-repo-url> foodapp
cd foodapp/foodapp-main
npm ci
cp .env.example .env
```

Edit `.env`:

```env
NODE_ENV=production
NEXT_PUBLIC_BASE_URL=https://your-domain-or-ec2-public-dns
DATABASE_URL=mysql://<db-user>:<db-pass>@<rds-endpoint>:3306/foodapp
AUTH_SECRET=<long-random-secret>
ASSET_BASE_URL=https://<cloudfront-domain-or-empty>
AWS_REGION=<region>
AWS_S3_BUCKET=<bucket-name>
```

Run setup and start:

```bash
npm run db:migrate
npm run build
npm run start
```

For background process:

```bash
sudo npm i -g pm2
pm2 start npm --name foodapp -- start
pm2 save
pm2 startup
```

## 9) CloudWatch logs

1. Install CloudWatch agent on EC2.
2. Configure log collection for:
   - app stdout/stderr
   - system logs
3. Verify logs in `CloudWatch` -> `Log groups`.

## 10) DNS + HTTPS (recommended)

- Point domain to EC2 (`Route 53` or your DNS provider).
- Use `Nginx + Certbot` (Let’s Encrypt) for TLS termination on port 443.

## 11) Project-specific behavior for image links

This code now supports both:

- absolute image URLs in DB (`https://...`)
- relative image links (`/images/...`) combined with `ASSET_BASE_URL`

So you can move media delivery to S3/CloudFront without changing existing menu rows.
