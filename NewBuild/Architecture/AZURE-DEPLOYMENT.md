# Azure Deployment Architecture

**Version**: 1.0.0
**Date**: November 23, 2024
**Platform**: Microsoft Azure

---

## Table of Contents
1. [Azure Service Mapping](#azure-service-mapping)
2. [Infrastructure as Code](#infrastructure-as-code)
3. [AKS Configuration](#aks-configuration)
4. [Database Configuration](#database-configuration)
5. [Networking Configuration](#networking-configuration)
6. [Security Configuration](#security-configuration)
7. [Monitoring & Observability](#monitoring--observability)
8. [Disaster Recovery](#disaster-recovery)
9. [Cost Optimization](#cost-optimization)
10. [Deployment Pipeline](#deployment-pipeline)

---

## Azure Service Mapping

### Core Services Selection

| Component | Azure Service | Tier/SKU | Justification |
|-----------|--------------|----------|---------------|
| **Compute** | AKS (Kubernetes) | Standard D4s v3 | Container orchestration, auto-scaling |
| **Database** | Azure Database for PostgreSQL | General Purpose, 8 vCores | Managed PostgreSQL, HA built-in |
| **Cache** | Azure Cache for Redis | Premium P2 | Clustering, persistence, geo-replication |
| **Storage** | Blob Storage | Hot/Cool/Archive tiers | Cost-effective object storage |
| **CDN** | Azure CDN | Standard Microsoft | Global edge locations, rules engine |
| **Load Balancer** | Application Gateway | WAF_v2 | L7 LB with WAF protection |
| **Message Queue** | Service Bus | Premium | Guaranteed delivery, FIFO |
| **Search** | Azure Cognitive Search | Standard S2 | Full-text search, AI enrichment |
| **Secrets** | Key Vault | Premium (HSM-backed) | Hardware security module support |
| **Monitoring** | Application Insights + Monitor | - | Full observability stack |
| **Security** | Sentinel + Defender | - | SIEM + threat protection |
| **DNS** | Azure DNS | - | Global DNS management |
| **Identity** | Azure AD B2C | Standard | Customer identity management |

### Regional Distribution

```yaml
regions:
  primary:
    location: East US
    services:
      - AKS cluster (production)
      - PostgreSQL primary
      - Redis primary
      - Application Gateway
      - Service Bus namespace

  secondary:
    location: West US 2
    services:
      - AKS cluster (standby)
      - PostgreSQL read replica
      - Redis geo-replica
      - Application Gateway (DR)

  global:
    services:
      - CDN (all regions)
      - Traffic Manager
      - Blob Storage (GRS)
      - Key Vault (replicated)
```

---

## Infrastructure as Code

### Terraform Configuration

```hcl
# main.tf - Core Infrastructure

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.75.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23.0"
    }
  }

  backend "azurerm" {
    resource_group_name  = "aideepref-terraform-rg"
    storage_account_name = "aideeprefterraform"
    container_name       = "tfstate"
    key                  = "prod.terraform.tfstate"
  }
}

# Resource Groups
resource "azurerm_resource_group" "main" {
  name     = "${var.project}-${var.environment}-rg"
  location = var.primary_region

  tags = {
    Environment = var.environment
    Project     = var.project
    ManagedBy   = "Terraform"
  }
}

# Virtual Network
resource "azurerm_virtual_network" "main" {
  name                = "${var.project}-${var.environment}-vnet"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  address_space       = ["10.0.0.0/16"]

  tags = azurerm_resource_group.main.tags
}

# Subnets
resource "azurerm_subnet" "aks" {
  name                 = "aks-subnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.1.0/24"]
}

resource "azurerm_subnet" "database" {
  name                 = "database-subnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.2.0/24"]

  delegation {
    name = "postgresql"
    service_delegation {
      name = "Microsoft.DBforPostgreSQL/flexibleServers"
      actions = [
        "Microsoft.Network/virtualNetworks/subnets/join/action",
      ]
    }
  }
}

resource "azurerm_subnet" "gateway" {
  name                 = "gateway-subnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.3.0/24"]
}

# AKS Cluster
resource "azurerm_kubernetes_cluster" "main" {
  name                = "${var.project}-${var.environment}-aks"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  dns_prefix          = "${var.project}-${var.environment}"

  default_node_pool {
    name                = "system"
    node_count          = 3
    vm_size            = "Standard_D4s_v3"
    enable_auto_scaling = true
    min_count          = 3
    max_count          = 10
    vnet_subnet_id     = azurerm_subnet.aks.id

    node_labels = {
      "nodepool-type" = "system"
      "environment"   = var.environment
      "nodepoolos"    = "linux"
    }

    tags = azurerm_resource_group.main.tags
  }

  identity {
    type = "SystemAssigned"
  }

  network_profile {
    network_plugin    = "azure"
    network_policy    = "calico"
    load_balancer_sku = "standard"
  }

  addon_profile {
    oms_agent {
      enabled                    = true
      log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id
    }

    kube_dashboard {
      enabled = false
    }

    azure_policy {
      enabled = true
    }
  }

  auto_scaler_profile {
    scale_down_delay_after_add = "10m"
    scale_down_utilization_threshold = 0.5
  }

  tags = azurerm_resource_group.main.tags
}

# Additional Node Pools
resource "azurerm_kubernetes_cluster_node_pool" "app" {
  name                  = "app"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.main.id
  vm_size              = "Standard_D4s_v3"
  node_count           = 5
  enable_auto_scaling  = true
  min_count           = 5
  max_count           = 20
  vnet_subnet_id      = azurerm_subnet.aks.id

  node_labels = {
    "nodepool-type" = "application"
    "workload-type" = "api"
  }

  node_taints = []

  tags = azurerm_resource_group.main.tags
}

resource "azurerm_kubernetes_cluster_node_pool" "gpu" {
  name                  = "gpu"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.main.id
  vm_size              = "Standard_NC6s_v3"  # GPU-enabled VMs
  node_count           = 2
  enable_auto_scaling  = true
  min_count           = 1
  max_count           = 5
  vnet_subnet_id      = azurerm_subnet.aks.id

  node_labels = {
    "nodepool-type" = "gpu"
    "workload-type" = "ai"
  }

  node_taints = [
    {
      key    = "gpu"
      value  = "true"
      effect = "NoSchedule"
    }
  ]

  tags = azurerm_resource_group.main.tags
}
```

### Azure Resource Manager Templates

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "projectName": {
      "type": "string",
      "defaultValue": "aideepref"
    },
    "environment": {
      "type": "string",
      "allowedValues": ["dev", "staging", "prod"],
      "defaultValue": "prod"
    }
  },
  "variables": {
    "storageAccountName": "[concat(parameters('projectName'), parameters('environment'), 'storage')]",
    "keyVaultName": "[concat(parameters('projectName'), '-', parameters('environment'), '-kv')]"
  },
  "resources": [
    {
      "type": "Microsoft.Storage/storageAccounts",
      "apiVersion": "2021-04-01",
      "name": "[variables('storageAccountName')]",
      "location": "[resourceGroup().location]",
      "sku": {
        "name": "Standard_GRS"
      },
      "kind": "StorageV2",
      "properties": {
        "accessTier": "Hot",
        "encryption": {
          "services": {
            "blob": {
              "enabled": true
            },
            "file": {
              "enabled": true
            }
          },
          "keySource": "Microsoft.Storage"
        },
        "supportsHttpsTrafficOnly": true,
        "minimumTlsVersion": "TLS1_2"
      }
    },
    {
      "type": "Microsoft.KeyVault/vaults",
      "apiVersion": "2021-06-01-preview",
      "name": "[variables('keyVaultName')]",
      "location": "[resourceGroup().location]",
      "properties": {
        "sku": {
          "family": "A",
          "name": "premium"
        },
        "tenantId": "[subscription().tenantId]",
        "enabledForDeployment": true,
        "enabledForDiskEncryption": true,
        "enabledForTemplateDeployment": true,
        "enableSoftDelete": true,
        "softDeleteRetentionInDays": 90,
        "enablePurgeProtection": true,
        "networkAcls": {
          "bypass": "AzureServices",
          "defaultAction": "Deny"
        }
      }
    }
  ]
}
```

---

## AKS Configuration

### Kubernetes Manifests

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: aideepref
  labels:
    name: aideepref
    environment: production

---
# deployment-api.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
  namespace: aideepref
  labels:
    app: api-gateway
    version: v1
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
        version: v1
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9090"
    spec:
      serviceAccountName: api-gateway
      containers:
      - name: api-gateway
        image: aideepref.azurecr.io/api-gateway:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 8080
          name: http
        - containerPort: 9090
          name: metrics
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-credentials
              key: connection-string
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-credentials
              key: connection-string
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - api-gateway
              topologyKey: kubernetes.io/hostname

---
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: api-gateway
  namespace: aideepref
  labels:
    app: api-gateway
spec:
  type: ClusterIP
  ports:
  - port: 80
    targetPort: 8080
    protocol: TCP
    name: http
  selector:
    app: api-gateway

---
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-gateway-hpa
  namespace: aideepref
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-gateway
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 100
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Pods
        value: 2
        periodSeconds: 60

---
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-gateway-ingress
  namespace: aideepref
  annotations:
    kubernetes.io/ingress.class: azure/application-gateway
    appgw.ingress.kubernetes.io/ssl-redirect: "true"
    appgw.ingress.kubernetes.io/use-private-ip: "false"
    appgw.ingress.kubernetes.io/backend-protocol: "http"
    appgw.ingress.kubernetes.io/backend-path-prefix: "/"
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - api.aideepref.com
    secretName: api-tls-secret
  rules:
  - host: api.aideepref.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-gateway
            port:
              number: 80
```

### Helm Chart Configuration

```yaml
# values.yaml for AiDeepRef Helm Chart
global:
  project: aideepref
  environment: production
  region: eastus
  domain: aideepref.com

image:
  registry: aideepref.azurecr.io
  pullPolicy: IfNotPresent
  tag: latest

api:
  replicaCount: 5
  resources:
    requests:
      memory: "512Mi"
      cpu: "500m"
    limits:
      memory: "1Gi"
      cpu: "1000m"
  autoscaling:
    enabled: true
    minReplicas: 5
    maxReplicas: 20
    targetCPU: 70
    targetMemory: 80

auth:
  replicaCount: 3
  resources:
    requests:
      memory: "256Mi"
      cpu: "250m"
    limits:
      memory: "512Mi"
      cpu: "500m"

ai:
  replicaCount: 2
  nodeSelector:
    workload-type: ai
  tolerations:
  - key: "gpu"
    operator: "Equal"
    value: "true"
    effect: "NoSchedule"
  resources:
    requests:
      memory: "2Gi"
      cpu: "1000m"
      nvidia.com/gpu: 1
    limits:
      memory: "4Gi"
      cpu: "2000m"
      nvidia.com/gpu: 1

redis:
  enabled: false  # Using Azure Redis
  external:
    host: aideepref-redis.redis.cache.windows.net
    port: 6380
    ssl: true

postgresql:
  enabled: false  # Using Azure PostgreSQL
  external:
    host: aideepref-postgresql.postgres.database.azure.com
    port: 5432
    database: aideepref
    ssl: require

ingress:
  enabled: true
  className: azure-application-gateway
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    appgw.ingress.kubernetes.io/ssl-redirect: "true"
  hosts:
  - host: api.aideepref.com
    paths:
    - path: /
      pathType: Prefix

monitoring:
  enabled: true
  prometheus:
    enabled: true
  grafana:
    enabled: true
  applicationInsights:
    enabled: true
    instrumentationKey: <key>
```

---

## Database Configuration

### Azure Database for PostgreSQL

```yaml
# PostgreSQL Configuration
postgresql:
  tier: GeneralPurpose
  compute:
    generation: Gen5
    vCores: 8
    storageMB: 524288  # 512 GB

  high_availability:
    mode: ZoneRedundant
    standbyAvailabilityZone: 2

  backup:
    retentionDays: 35
    geoRedundant: true

  security:
    sslEnforcement: Enabled
    minimumTlsVersion: TLS1_2
    publicNetworkAccess: Disabled
    privateEndpoint: Enabled

  performance:
    configuration:
      max_connections: 200
      shared_buffers: 2GB
      effective_cache_size: 6GB
      maintenance_work_mem: 512MB
      checkpoint_completion_target: 0.9
      wal_buffers: 16MB
      default_statistics_target: 100
      random_page_cost: 1.1
      effective_io_concurrency: 200
      work_mem: 10485kB
      min_wal_size: 1GB
      max_wal_size: 4GB

  monitoring:
    diagnosticLogs:
      - PostgreSQLLogs
      - QueryStoreRuntimeStatistics
      - QueryStoreWaitStatistics
    metrics:
      - AllMetrics
```

### Redis Cache Configuration

```yaml
# Azure Cache for Redis
redis:
  tier: Premium
  size: P2  # 13 GB

  configuration:
    clustering: true
    shardCount: 4

  persistence:
    rdbBackup:
      enabled: true
      frequency: 60  # minutes
      storageAccount: aideeprefbackup

    aofBackup:
      enabled: false  # RDB preferred for our use case

  replication:
    geoReplication:
      enabled: true
      secondaryLocation: westus2

  security:
    accessKeys: rotated_quarterly
    tlsVersion: 1.2
    nonSslPort: false
    virtualNetwork:
      subnet: /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Network/virtualNetworks/{vnet}/subnets/redis

  maxclients: 10000
  maxmemory-policy: allkeys-lru
  tcp-keepalive: 60
  timeout: 300
```

---

## Networking Configuration

### Application Gateway Setup

```yaml
# Application Gateway Configuration
applicationGateway:
  tier: WAF_v2
  capacity: 2
  autoScale:
    minCapacity: 2
    maxCapacity: 10

  frontendIP:
    public:
      name: aideepref-public-ip
      domainNameLabel: aideepref-api
    private:
      name: aideepref-private-ip
      subnet: gateway-subnet
      ipAddress: 10.0.3.10

  sslCertificates:
    - name: api-cert
      keyVaultSecretId: https://aideepref-kv.vault.azure.net/secrets/api-cert

  backendPools:
    - name: aks-backend
      targets:
        - 10.0.1.0/24  # AKS subnet

  httpListeners:
    - name: https-listener
      protocol: Https
      port: 443
      sslCertificate: api-cert
      hostName: api.aideepref.com

  urlPathMaps:
    - name: api-paths
      defaultBackendPool: aks-backend
      pathRules:
        - paths: ["/api/*"]
          backendPool: aks-backend
        - paths: ["/ws/*"]
          backendPool: websocket-backend

  wafConfiguration:
    enabled: true
    firewallMode: Prevention
    ruleSetType: OWASP
    ruleSetVersion: 3.2
    customRules:
      - name: BlockSuspiciousAgents
        priority: 1
        ruleType: MatchRule
        matchConditions:
          - matchVariable: RequestHeaders
            selector: User-Agent
            operator: Contains
            matchValues: ["bot", "crawler", "scanner"]
        action: Block

  probes:
    - name: health-probe
      protocol: Https
      path: /health
      interval: 30
      timeout: 30
      unhealthyThreshold: 3
```

### Virtual Network Configuration

```yaml
# VNet and Subnets
network:
  vnet:
    addressSpace: 10.0.0.0/16
    dnsServers:
      - 10.0.0.4
      - 10.0.0.5

  subnets:
    gateway:
      addressPrefix: 10.0.0.0/24
      nsg: gateway-nsg

    aks:
      addressPrefix: 10.0.1.0/22  # /22 for AKS scaling
      nsg: aks-nsg
      serviceEndpoints:
        - Microsoft.Storage
        - Microsoft.KeyVault
        - Microsoft.Sql

    database:
      addressPrefix: 10.0.8.0/24
      nsg: database-nsg
      delegation: Microsoft.DBforPostgreSQL/flexibleServers

    management:
      addressPrefix: 10.0.9.0/24
      nsg: management-nsg

  networkSecurityGroups:
    gateway-nsg:
      rules:
        - name: Allow-HTTPS
          priority: 100
          direction: Inbound
          access: Allow
          protocol: Tcp
          sourcePort: "*"
          destinationPort: 443
          sourceAddress: Internet
          destinationAddress: "*"

    aks-nsg:
      rules:
        - name: Allow-Gateway
          priority: 100
          direction: Inbound
          access: Allow
          protocol: "*"
          sourceAddress: 10.0.0.0/24
          destinationAddress: 10.0.1.0/22

    database-nsg:
      rules:
        - name: Allow-AKS
          priority: 100
          direction: Inbound
          access: Allow
          protocol: Tcp
          sourcePort: "*"
          destinationPort: 5432
          sourceAddress: 10.0.1.0/22
          destinationAddress: 10.0.8.0/24
```

---

## Security Configuration

### Azure Key Vault

```yaml
# Key Vault Configuration
keyVault:
  name: aideepref-kv
  sku: premium

  accessPolicies:
    - tenantId: <tenant-id>
      objectId: <aks-managed-identity>
      permissions:
        keys: [get, list]
        secrets: [get, list]
        certificates: [get, list]

  secrets:
    - database-connection-string
    - redis-connection-string
    - openrouter-api-key
    - jwt-secret
    - encryption-key
    - blockchain-private-key

  keys:
    - name: data-encryption-key
      type: RSA-HSM
      size: 4096
      operations: [encrypt, decrypt, sign, verify]

  certificates:
    - name: api-ssl-cert
      subject: CN=api.aideepref.com
      sans:
        - api.aideepref.com
        - *.aideepref.com

  networkAcls:
    bypass: AzureServices
    defaultAction: Deny
    ipRules:
      - <office-ip-range>
    virtualNetworkRules:
      - /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Network/virtualNetworks/{vnet}/subnets/aks
```

### Azure AD B2C Configuration

```yaml
# Azure AD B2C Setup
azureADB2C:
  tenant: aideepref.onmicrosoft.com

  userFlows:
    signUpSignIn:
      name: B2C_1_SignUpSignIn
      identityProviders:
        - Local Account
        - Google
        - Microsoft
        - LinkedIn
      attributes:
        - email
        - displayName
        - givenName
        - surname
        - jobTitle
        - company

    passwordReset:
      name: B2C_1_PasswordReset

    profileEdit:
      name: B2C_1_ProfileEdit

  customPolicies:
    mfa:
      enabled: true
      methods:
        - phone
        - authenticator
        - email

    conditionalAccess:
      - name: RequireMFAForAdmins
        conditions:
          users: admin_role
        grant:
          requireMfa: true

  apiConnectors:
    - name: UserValidation
      endpoint: https://api.aideepref.com/auth/validate
      authentication: Basic

  branding:
    backgroundColor: "#1a1a1a"
    logoUrl: "https://cdn.aideepref.com/logo.png"
    bannerUrl: "https://cdn.aideepref.com/banner.png"
```

---

## Monitoring & Observability

### Application Insights

```yaml
# Application Insights Configuration
applicationInsights:
  instrumentationKey: <key>

  sampling:
    enabled: true
    percentage: 10  # Sample 10% in production

  telemetry:
    - requests
    - dependencies
    - exceptions
    - traces
    - metrics
    - customEvents

  alerts:
    - name: HighResponseTime
      metric: requests/duration
      threshold: 1000  # ms
      aggregation: Average
      window: 5m

    - name: HighErrorRate
      metric: requests/failed
      threshold: 5  # percent
      aggregation: Percentage
      window: 5m

    - name: LowAvailability
      metric: availabilityResults/availabilityPercentage
      threshold: 99.9
      aggregation: Average
      window: 5m
```

### Log Analytics

```yaml
# Log Analytics Workspace
logAnalytics:
  retentionInDays: 90

  dataSources:
    - AKS Cluster
    - Application Gateway
    - PostgreSQL
    - Redis
    - Key Vault
    - Azure AD

  queries:
    slowQueries: |
      AzureDiagnostics
      | where Category == "PostgreSQLLogs"
      | where Message contains "duration:"
      | parse Message with * "duration: " Duration " ms" *
      | where todouble(Duration) > 1000
      | summarize Count=count(), Avg=avg(todouble(Duration)) by bin(TimeGenerated, 5m)

    securityEvents: |
      SecurityEvent
      | where EventID in (4624, 4625, 4720, 4726)
      | summarize Count=count() by Activity, Account, Computer

    apiErrors: |
      AppRequests
      | where Success == false
      | summarize ErrorCount=count() by Name, ResultCode, bin(TimeGenerated, 5m)
```

### Azure Monitor

```yaml
# Azure Monitor Configuration
monitor:
  actionGroups:
    - name: CriticalAlerts
      email:
        - oncall@aideepref.com
        - security@aideepref.com
      sms:
        - +1-555-0100
      webhook:
        - https://hooks.slack.com/services/...

  metricAlerts:
    - name: AKS-CPU-High
      resource: /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.ContainerService/managedClusters/aideepref-aks
      metric: node_cpu_usage_percentage
      operator: GreaterThan
      threshold: 80
      aggregation: Average
      windowSize: 5m

    - name: Database-Connections-High
      resource: /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.DBforPostgreSQL/servers/aideepref-pg
      metric: connections_active
      operator: GreaterThan
      threshold: 180
      aggregation: Maximum
      windowSize: 5m

  logAlerts:
    - name: SecurityBreachAttempt
      query: |
        SecurityEvent
        | where EventID == 4625
        | summarize Count=count() by Account
        | where Count > 5
      severity: 1
      evaluationFrequency: 5m
      windowSize: 5m
```

---

## Disaster Recovery

### Backup Strategy

```yaml
# Backup Configuration
backup:
  azureBackup:
    vault: aideepref-backup-vault

    policies:
      database:
        frequency: Daily
        time: 02:00
        retention:
          daily: 7
          weekly: 4
          monthly: 12
          yearly: 5

      aks:
        frequency: Daily
        time: 03:00
        retention:
          daily: 7
          weekly: 2

      storage:
        frequency: Continuous
        pointInTimeRestore: 7 days

  crossRegionReplication:
    enabled: true
    targetRegion: westus2

  testing:
    frequency: Quarterly
    scope:
      - Database restore
      - AKS restore
      - Full failover test
```

### Disaster Recovery Plan

```yaml
# DR Configuration
disasterRecovery:
  rto: 4 hours
  rpo: 1 hour

  failoverGroups:
    database:
      primary: eastus
      secondary: westus2
      readWriteEndpoint:
        failoverPolicy: Automatic
        graceperiod: 1 hour

    redis:
      primary: eastus
      secondary: westus2
      linkedCache: aideepref-redis-westus2

  trafficManager:
    profile: aideepref-tm
    routingMethod: Priority
    endpoints:
      - name: primary-eastus
        priority: 1
        target: aideepref-eastus.azurewebsites.net

      - name: secondary-westus2
        priority: 2
        target: aideepref-westus2.azurewebsites.net

  runbooks:
    - name: Database Failover
      steps:
        1. Trigger failover group failover
        2. Update connection strings
        3. Verify connectivity
        4. Notify team

    - name: Full Site Failover
      steps:
        1. Activate secondary AKS
        2. Failover database
        3. Switch Traffic Manager
        4. Update DNS if needed
        5. Verify all services
        6. Notify stakeholders
```

---

## Cost Optimization

### Resource Tagging Strategy

```yaml
# Tagging Policy
tagging:
  mandatory:
    - Environment: [dev, staging, prod]
    - Project: aideepref
    - CostCenter: [engineering, operations]
    - Owner: [email]
    - CreatedDate: [YYYY-MM-DD]

  optional:
    - Purpose: [description]
    - Criticality: [low, medium, high, critical]
    - DataClassification: [public, internal, confidential, restricted]
```

### Cost Management

```yaml
# Cost Optimization Strategies
costOptimization:
  compute:
    - Use Reserved Instances for predictable workloads (60% savings)
    - Use Spot Instances for batch processing (up to 90% savings)
    - Right-size VMs based on utilization metrics
    - Auto-scale based on demand

  storage:
    - Lifecycle management (Hot → Cool → Archive)
    - Delete unused snapshots
    - Compress data before storage
    - Use CDN for frequently accessed content

  database:
    - Use read replicas for read-heavy workloads
    - Pause dev/test databases when not in use
    - Right-size based on DTU/vCore utilization

  network:
    - Use Private Endpoints to avoid data transfer costs
    - Implement caching to reduce API calls
    - Use CDN for global content delivery

  monitoring:
    budgets:
      - name: Monthly-Production
        amount: 10000
        notifications:
          - 80%: warning
          - 100%: critical
          - 120%: immediate action

    recommendations:
      - Review Azure Advisor weekly
      - Analyze cost analysis reports monthly
      - Optimize underutilized resources quarterly
```

---

## Deployment Pipeline

### CI/CD with Azure DevOps

```yaml
# azure-pipelines.yml
trigger:
  branches:
    include:
      - main
      - develop
  paths:
    include:
      - src/*
      - infrastructure/*

pool:
  vmImage: 'ubuntu-latest'

variables:
  dockerRegistry: 'aideepref.azurecr.io'
  imageName: 'api-gateway'
  k8sNamespace: 'aideepref'

stages:
  - stage: Build
    jobs:
      - job: BuildAndTest
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: '20.x'

          - script: |
              npm ci
              npm run test
              npm run build
            displayName: 'Build and Test'

          - task: Docker@2
            inputs:
              containerRegistry: 'ACR-Connection'
              repository: $(imageName)
              command: 'buildAndPush'
              Dockerfile: '**/Dockerfile'
              tags: |
                $(Build.BuildId)
                latest

  - stage: DeployDev
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/develop'))
    jobs:
      - deployment: DeployToDev
        environment: 'Development'
        strategy:
          runOnce:
            deploy:
              steps:
                - task: Kubernetes@1
                  inputs:
                    connectionType: 'Azure Resource Manager'
                    azureSubscriptionEndpoint: 'Azure-Subscription'
                    azureResourceGroup: 'aideepref-dev-rg'
                    kubernetesCluster: 'aideepref-dev-aks'
                    namespace: $(k8sNamespace)
                    command: 'apply'
                    arguments: '-f k8s/dev/'

  - stage: DeployProd
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    jobs:
      - deployment: DeployToProd
        environment: 'Production'
        strategy:
          canary:
            increments: [10, 50, 100]
            preDeploy:
              steps:
                - script: echo "Pre-deployment validation"
            deploy:
              steps:
                - task: Kubernetes@1
                  inputs:
                    connectionType: 'Azure Resource Manager'
                    azureSubscriptionEndpoint: 'Azure-Subscription'
                    azureResourceGroup: 'aideepref-prod-rg'
                    kubernetesCluster: 'aideepref-prod-aks'
                    namespace: $(k8sNamespace)
                    command: 'apply'
                    arguments: '-f k8s/prod/'
            postRouteTraffic:
              steps:
                - script: |
                    # Run smoke tests
                    npm run test:smoke
            onSuccess:
              steps:
                - script: echo "Deployment successful"
            onFailure:
              steps:
                - script: |
                    # Rollback
                    kubectl rollout undo deployment/api-gateway -n $(k8sNamespace)
```

### GitOps with Flux

```yaml
# flux-config.yaml
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: GitRepository
metadata:
  name: aideepref
  namespace: flux-system
spec:
  interval: 1m
  ref:
    branch: main
  url: https://github.com/aideepref/infrastructure

---
apiVersion: kustomize.toolkit.fluxcd.io/v1beta2
kind: Kustomization
metadata:
  name: aideepref-production
  namespace: flux-system
spec:
  interval: 10m
  path: "./k8s/production"
  prune: true
  sourceRef:
    kind: GitRepository
    name: aideepref
  validation: client
  postBuild:
    substitute:
      environment: "production"
      region: "eastus"
```

---

## Performance Optimization

### Azure Front Door Configuration

```yaml
# Front Door for Global Distribution
frontDoor:
  profile: aideepref-fd
  tier: Premium

  endpoints:
    - name: api-global
      hostname: api-global.aideepref.com

  originGroups:
    - name: api-origins
      loadBalancing:
        sampleSize: 4
        successfulSamplesRequired: 2
      healthProbe:
        path: /health
        interval: 30
        protocol: Https

  origins:
    - name: eastus-origin
      hostname: api-eastus.aideepref.com
      priority: 1
      weight: 100

    - name: westus-origin
      hostname: api-westus.aideepref.com
      priority: 2
      weight: 50

  routes:
    - name: api-route
      endpoint: api-global
      originGroup: api-origins
      patterns:
        - /*
      caching:
        queryStringBehavior: UseQueryString
        compressionEnabled: true
        cacheDuration: 5 minutes

  wafPolicy:
    mode: Prevention
    customRules:
      - name: RateLimitByIP
        priority: 1
        ruleType: RateLimitRule
        rateLimitThreshold: 1000
        rateLimitDurationInMinutes: 1
        action: Block
```

---

## Conclusion

This Azure deployment architecture provides:

1. **High Availability**: Multi-region deployment with automatic failover
2. **Scalability**: Auto-scaling at every layer based on demand
3. **Security**: Defense in depth with Azure security services
4. **Performance**: Global CDN, optimized database configuration
5. **Cost Optimization**: Reserved instances, spot VMs, and lifecycle policies
6. **Observability**: Comprehensive monitoring and alerting
7. **Disaster Recovery**: Automated backup and failover procedures

The architecture leverages Azure's managed services to minimize operational overhead while maintaining flexibility and control where needed.

---

*End of Azure Deployment Architecture*