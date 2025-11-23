# Azure Implementation Guide for Data Architecture
## Practical Configuration and Code Examples

---

## 1. Azure Event Hubs Configuration

### 1.1 Terraform Configuration
```hcl
resource "azurerm_eventhub_namespace" "aidefref_events" {
  name                = "aidefref-events-prod"
  location            = var.location
  resource_group_name = var.resource_group_name
  sku                 = "Standard"
  capacity            = 10  # Throughput units

  network_rulesets {
    default_action = "Deny"

    ip_rule {
      ip_mask = var.allowed_ip_range
      action  = "Allow"
    }

    virtual_network_rule {
      subnet_id = var.subnet_id
    }
  }

  tags = {
    environment = "production"
    purpose     = "telemetry-ingestion"
  }
}

resource "azurerm_eventhub" "user_events" {
  name                = "user-events"
  namespace_name      = azurerm_eventhub_namespace.aidefref_events.name
  resource_group_name = var.resource_group_name
  partition_count     = 32
  message_retention   = 7  # days

  capture_description {
    enabled             = true
    encoding            = "Avro"
    interval_in_seconds = 300
    size_limit_in_bytes = 314572800  # 300MB

    destination {
      name                = "EventHubArchive.AzureBlockBlob"
      archive_name_format = "{Namespace}/{EventHub}/{PartitionId}/{Year}/{Month}/{Day}/{Hour}/{Minute}/{Second}"

      storage_account_id = var.storage_account_id
      blob_container_name = "event-archive"
    }
  }
}
```

### 1.2 Event Hub Producer (Python)
```python
import json
import asyncio
from azure.eventhub.aio import EventHubProducerClient
from azure.eventhub import EventData
from azure.identity import DefaultAzureCredential

class EventHubTelemetryClient:
    def __init__(self, namespace, hub_name):
        self.credential = DefaultAzureCredential()
        self.client = EventHubProducerClient(
            fully_qualified_namespace=f"{namespace}.servicebus.windows.net",
            eventhub_name=hub_name,
            credential=self.credential
        )
        self.batch_size = 100
        self.event_buffer = []

    async def send_event(self, event_data):
        """Send single event or buffer for batch"""
        self.event_buffer.append(event_data)

        if len(self.event_buffer) >= self.batch_size:
            await self.flush()

    async def flush(self):
        """Send buffered events as batch"""
        if not self.event_buffer:
            return

        async with self.client:
            batch = await self.client.create_batch()

            for event in self.event_buffer:
                try:
                    batch.add(EventData(json.dumps(event)))
                except ValueError:
                    # Batch full, send and create new batch
                    await self.client.send_batch(batch)
                    batch = await self.client.create_batch()
                    batch.add(EventData(json.dumps(event)))

            await self.client.send_batch(batch)

        self.event_buffer.clear()

    async def track_user_interaction(self, user_id, action, metadata):
        """Track user interaction event"""
        event = {
            "event_type": "user_interaction",
            "user_id": user_id,
            "action": action,
            "metadata": metadata,
            "timestamp": datetime.utcnow().isoformat(),
            "correlation_id": str(uuid.uuid4())
        }
        await self.send_event(event)
```

---

## 2. Azure Stream Analytics Jobs

### 2.1 Stream Analytics Query for Real-time Processing
```sql
-- User Session Analysis
WITH
UserEvents AS (
    SELECT
        userId,
        eventName,
        eventTimestamp,
        sessionId,
        GetRecordPropertyValue(properties, '$.page') as page,
        GetRecordPropertyValue(properties, '$.action') as action,
        GetRecordPropertyValue(properties, '$.duration') as duration
    FROM
        EventHub TIMESTAMP BY eventTimestamp
),

SessionAggregates AS (
    SELECT
        userId,
        sessionId,
        COUNT(*) as eventCount,
        MIN(eventTimestamp) as sessionStart,
        MAX(eventTimestamp) as sessionEnd,
        COLLECT() as events,
        System.Timestamp() as windowEnd
    FROM
        UserEvents
    GROUP BY
        userId,
        sessionId,
        TumblingWindow(minute, 5)
),

AnomalyDetection AS (
    SELECT
        userId,
        eventCount,
        AnomalyDetection_SpikeAndDip(
            CAST(eventCount AS float),
            95,
            120,
            'spikesanddips'
        ) OVER(LIMIT DURATION(minute, 120)) as anomalyScore
    FROM
        SessionAggregates
)

-- Output to multiple destinations
SELECT * INTO PowerBIDataset FROM SessionAggregates
SELECT * INTO CosmosDBHotStore FROM UserEvents WHERE action = 'purchase'
SELECT * INTO SecurityAlerts FROM AnomalyDetection WHERE anomalyScore.IsAnomaly = 1
```

### 2.2 ARM Template for Stream Analytics
```json
{
    "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
    "contentVersion": "1.0.0.0",
    "parameters": {
        "streamAnalyticsJobName": {
            "type": "string",
            "defaultValue": "aidefref-stream-analytics"
        }
    },
    "resources": [
        {
            "type": "Microsoft.StreamAnalytics/streamingjobs",
            "apiVersion": "2021-10-01-preview",
            "name": "[parameters('streamAnalyticsJobName')]",
            "location": "[resourceGroup().location]",
            "properties": {
                "sku": {
                    "name": "Standard"
                },
                "outputStartMode": "JobStartTime",
                "eventsOutOfOrderPolicy": "Adjust",
                "outputErrorPolicy": "Stop",
                "eventsOutOfOrderMaxDelayInSeconds": 10,
                "eventsLateArrivalMaxDelayInSeconds": 20,
                "dataLocale": "en-US",
                "compatibilityLevel": "1.2",
                "transformation": {
                    "name": "ProcessUserEvents",
                    "properties": {
                        "streamingUnits": 6,
                        "query": "[concat(variables('streamAnalyticsQuery'))]"
                    }
                }
            }
        }
    ]
}
```

---

## 3. Azure Cosmos DB Configuration

### 3.1 Cosmos DB SDK Implementation
```python
from azure.cosmos import CosmosClient, PartitionKey
from azure.cosmos.exceptions import CosmosResourceExistsError
import os

class CosmosDBDataStore:
    def __init__(self):
        self.client = CosmosClient(
            url=os.environ['COSMOS_ENDPOINT'],
            credential=os.environ['COSMOS_KEY']
        )
        self.database_name = "AiDefRefAnalytics"
        self.setup_containers()

    def setup_containers(self):
        """Create containers with appropriate partition keys"""

        containers = [
            {
                "id": "UserProfiles",
                "partition_key": "/userId",
                "default_ttl": None,
                "indexing_policy": {
                    "automatic": True,
                    "includedPaths": [{"path": "/*"}],
                    "excludedPaths": [{"path": "/\"_etag\"/?"}]
                }
            },
            {
                "id": "UserSessions",
                "partition_key": "/userId",
                "default_ttl": 604800,  # 7 days in seconds
                "indexing_policy": {
                    "automatic": True,
                    "compositeIndexes": [
                        [
                            {"path": "/userId", "order": "ascending"},
                            {"path": "/timestamp", "order": "descending"}
                        ]
                    ]
                }
            },
            {
                "id": "AIInteractions",
                "partition_key": "/userId",
                "default_ttl": 2592000,  # 30 days
                "unique_keys": [{"paths": ["/interactionId"]}]
            }
        ]

        database = self.client.create_database_if_not_exists(
            id=self.database_name
        )

        for container_config in containers:
            try:
                container = database.create_container(
                    id=container_config["id"],
                    partition_key=PartitionKey(path=container_config["partition_key"]),
                    default_ttl=container_config.get("default_ttl"),
                    indexing_policy=container_config.get("indexing_policy"),
                    unique_key_policy={"uniqueKeys": container_config.get("unique_keys", [])}
                )
                print(f"Created container: {container_config['id']}")
            except CosmosResourceExistsError:
                print(f"Container already exists: {container_config['id']}")

    async def upsert_user_profile(self, user_data):
        """Upsert user profile with metadata"""
        container = self.client.get_database_client(self.database_name)\
                              .get_container_client("UserProfiles")

        user_document = {
            "id": user_data["user_id"],
            "userId": user_data["user_id"],
            "profile": user_data["profile"],
            "metadata": user_data["metadata"],
            "lastUpdated": datetime.utcnow().isoformat(),
            "_ts": int(time.time())
        }

        return container.upsert_item(user_document)
```

---

## 4. Azure Data Lake Storage Gen2 Setup

### 4.1 Data Lake Organization Structure
```python
class DataLakeOrganizer:
    def __init__(self, account_name, account_key):
        self.service_client = DataLakeServiceClient(
            account_url=f"https://{account_name}.dfs.core.windows.net",
            credential=account_key
        )

    def setup_data_lake_structure(self):
        """Create organized folder structure for data lake"""

        structure = {
            "raw": {
                "events": ["user", "system", "security"],
                "logs": ["application", "api", "audit"],
                "external": ["osint", "third_party"]
            },
            "processed": {
                "daily": ["aggregates", "metrics", "reports"],
                "realtime": ["sessions", "alerts"],
                "ml": ["features", "training", "predictions"]
            },
            "curated": {
                "business": ["revenue", "usage", "customer"],
                "analytics": ["dashboards", "adhoc"],
                "compliance": ["gdpr", "ccpa", "audit"]
            }
        }

        file_system_client = self.service_client.create_file_system("datalake")

        for layer, categories in structure.items():
            for category, subcategories in categories.items():
                for subcategory in subcategories:
                    path = f"{layer}/{category}/{subcategory}"
                    directory_client = file_system_client.create_directory(path)

                    # Set ACLs for proper access control
                    acl = f"user::rwx,group::r-x,other::---"
                    directory_client.set_access_control(acl=acl)

    def write_parquet_data(self, df, path):
        """Write DataFrame to Data Lake as Parquet"""

        # Convert to Parquet bytes
        parquet_buffer = io.BytesIO()
        df.to_parquet(parquet_buffer, engine='pyarrow', compression='snappy')
        parquet_bytes = parquet_buffer.getvalue()

        # Write to Data Lake
        file_client = self.service_client.get_file_client(
            file_system="datalake",
            file_path=path
        )

        file_client.upload_data(parquet_bytes, overwrite=True)

        # Set metadata
        metadata = {
            "record_count": str(len(df)),
            "columns": ','.join(df.columns),
            "created_date": datetime.utcnow().isoformat()
        }
        file_client.set_metadata(metadata)
```

### 4.2 Delta Lake Implementation
```python
from delta import DeltaTable, configure_spark_with_delta_pip
from pyspark.sql import SparkSession

# Configure Spark for Delta Lake
builder = SparkSession.builder \
    .appName("AiDefRefDeltaLake") \
    .config("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension") \
    .config("spark.sql.catalog.spark_catalog", "org.apache.spark.sql.delta.catalog.DeltaCatalog")

spark = configure_spark_with_delta_pip(builder).getOrCreate()

# Configure Azure Data Lake access
spark.conf.set(
    f"fs.azure.account.key.{storage_account}.dfs.core.windows.net",
    storage_key
)

class DeltaLakeManager:
    def __init__(self, spark_session):
        self.spark = spark_session
        self.base_path = f"abfss://datalake@{storage_account}.dfs.core.windows.net"

    def create_delta_table(self, table_name, schema, partition_by=None):
        """Create a new Delta table with schema"""

        path = f"{self.base_path}/delta/{table_name}"

        df_builder = self.spark.createDataFrame([], schema)

        if partition_by:
            df_builder.write \
                .mode("overwrite") \
                .partitionBy(partition_by) \
                .format("delta") \
                .save(path)
        else:
            df_builder.write \
                .mode("overwrite") \
                .format("delta") \
                .save(path)

        # Enable Delta features
        delta_table = DeltaTable.forPath(self.spark, path)

        # Enable change data feed for CDC
        self.spark.sql(f"""
            ALTER TABLE delta.`{path}`
            SET TBLPROPERTIES (delta.enableChangeDataFeed = true)
        """)

        return delta_table

    def optimize_delta_table(self, table_path):
        """Optimize Delta table for better performance"""

        delta_table = DeltaTable.forPath(self.spark, table_path)

        # Compact small files
        delta_table.optimize().executeCompaction()

        # Z-order by commonly filtered columns
        delta_table.optimize().executeZOrderBy("userId", "timestamp")

        # Vacuum old files
        delta_table.vacuum(168)  # 7 days retention
```

---

## 5. Azure Synapse Analytics Setup

### 5.1 Synapse Workspace Configuration
```bicep
resource synapseWorkspace 'Microsoft.Synapse/workspaces@2021-06-01' = {
  name: 'aidefref-synapse-prod'
  location: resourceGroup().location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    defaultDataLakeStorage: {
      accountUrl: 'https://${storageAccountName}.dfs.core.windows.net'
      filesystem: 'synapse'
    }
    encryption: {
      cmk: {
        kekIdentity: {
          userAssignedIdentity: managedIdentityId
        }
        key: {
          name: keyName
          keyVaultUrl: keyVaultUrl
        }
      }
    }
    managedResourceGroupName: '${resourceGroup().name}-managed'
    sqlAdministratorLogin: sqlAdminUsername
    sqlAdministratorLoginPassword: sqlAdminPassword
    publicNetworkAccess: 'Disabled'
    managedVirtualNetwork: 'default'
  }
}

resource sqlPool 'Microsoft.Synapse/workspaces/sqlPools@2021-06-01' = {
  parent: synapseWorkspace
  name: 'aidefref_dwh'
  location: resourceGroup().location
  sku: {
    name: 'DW1000c'
    capacity: 1000
  }
  properties: {
    collation: 'SQL_Latin1_General_CP1_CI_AS'
    maxSizeBytes: 263882790666240
    storageAccountType: 'GRS'
  }
}

resource sparkPool 'Microsoft.Synapse/workspaces/bigDataPools@2021-06-01' = {
  parent: synapseWorkspace
  name: 'sparkpool'
  location: resourceGroup().location
  properties: {
    nodeCount: 3
    nodeSizeFamily: 'MemoryOptimized'
    nodeSize: 'Medium'
    autoScale: {
      enabled: true
      minNodeCount: 3
      maxNodeCount: 10
    }
    autoPause: {
      enabled: true
      delayInMinutes: 15
    }
    sparkVersion: '3.2'
  }
}
```

### 5.2 Synapse Pipeline for ETL
```json
{
    "name": "UserDataETLPipeline",
    "properties": {
        "activities": [
            {
                "name": "ExtractFromDataLake",
                "type": "Copy",
                "inputs": [
                    {
                        "referenceName": "DataLakeParquet",
                        "type": "DatasetReference"
                    }
                ],
                "outputs": [
                    {
                        "referenceName": "SynapseStaging",
                        "type": "DatasetReference"
                    }
                ],
                "typeProperties": {
                    "source": {
                        "type": "ParquetSource",
                        "storeSettings": {
                            "type": "AzureBlobFSReadSettings",
                            "recursive": true,
                            "wildcardFolderPath": "processed/daily/*/",
                            "wildcardFileName": "*.parquet"
                        }
                    },
                    "sink": {
                        "type": "SqlDWSink",
                        "allowPolyBase": true,
                        "polyBaseSettings": {
                            "rejectValue": 0,
                            "rejectType": "value",
                            "useTypeDefault": true
                        }
                    },
                    "enableStaging": true,
                    "stagingSettings": {
                        "linkedServiceName": {
                            "referenceName": "StagingStorage",
                            "type": "LinkedServiceReference"
                        }
                    }
                }
            },
            {
                "name": "TransformWithSQL",
                "type": "SqlPoolStoredProcedure",
                "dependsOn": [
                    {
                        "activity": "ExtractFromDataLake",
                        "dependencyConditions": ["Succeeded"]
                    }
                ],
                "typeProperties": {
                    "storedProcedureName": "sp_TransformUserData"
                }
            },
            {
                "name": "LoadToDimensions",
                "type": "DataFlow",
                "dependsOn": [
                    {
                        "activity": "TransformWithSQL",
                        "dependencyConditions": ["Succeeded"]
                    }
                ],
                "typeProperties": {
                    "dataflow": {
                        "referenceName": "DimensionalModelLoad",
                        "type": "DataFlowReference"
                    }
                }
            }
        ]
    }
}
```

---

## 6. Azure Machine Learning Integration

### 6.1 Feature Store Setup
```python
from azure.ai.ml import MLClient
from azure.ai.ml.entities import FeatureStore, FeatureSet, FeatureSetSpecification
from azure.identity import DefaultAzureCredential

class MLFeatureStore:
    def __init__(self, subscription_id, resource_group):
        self.ml_client = MLClient(
            DefaultAzureCredential(),
            subscription_id=subscription_id,
            resource_group_name=resource_group
        )

    def create_feature_store(self):
        """Create centralized feature store"""

        feature_store = FeatureStore(
            name="aidefref-features",
            location="eastus",
            description="Centralized feature store for AiDefRef ML models",
            tags={"purpose": "ml-features", "env": "production"}
        )

        self.ml_client.feature_stores.begin_create_or_update(feature_store).wait()

    def register_feature_set(self, name, query, features):
        """Register a new feature set"""

        feature_spec = FeatureSetSpecification(
            source=query,
            features=[
                {
                    "name": feature["name"],
                    "type": feature["type"],
                    "description": feature["description"]
                }
                for feature in features
            ],
            timestamp_column={"name": "timestamp"},
            index_columns=[{"name": "user_id"}]
        )

        feature_set = FeatureSet(
            name=name,
            version="1",
            description=f"Feature set for {name}",
            specification=feature_spec,
            tags={"refreshed": datetime.now().isoformat()}
        )

        self.ml_client.feature_sets.begin_create_or_update(feature_set).wait()

    def get_training_features(self, feature_sets, entity_df):
        """Retrieve features for model training"""

        from feast import FeatureStore

        fs = FeatureStore(repo_path="feature_repo")

        training_data = fs.get_historical_features(
            entity_df=entity_df,
            features=feature_sets,
            full_feature_names=True
        ).to_df()

        return training_data
```

### 6.2 Model Training Pipeline
```python
from azure.ai.ml import command, Input, Output
from azure.ai.ml.dsl import pipeline

@pipeline(
    compute="gpu-cluster",
    description="Training pipeline for AiDefRef models"
)
def ml_training_pipeline(
    training_data: Input,
    model_type: str = "reference_quality"
):
    # Data preparation step
    prep_step = command(
        name="data_preparation",
        display_name="Prepare Training Data",
        code="./src/data_prep",
        command="python prep_data.py --input ${{inputs.data}} --output ${{outputs.prepared_data}}",
        inputs={"data": training_data},
        outputs={"prepared_data": Output(type="uri_folder")},
        environment="azureml:data-science-env:1"
    )

    # Model training step
    train_step = command(
        name="model_training",
        display_name="Train Model",
        code="./src/training",
        command=f"python train.py --data ${{inputs.data}} --model_type {model_type} --output ${{outputs.model}}",
        inputs={"data": prep_step.outputs.prepared_data},
        outputs={"model": Output(type="mlflow_model")},
        environment="azureml:training-env:1"
    )

    # Model evaluation step
    eval_step = command(
        name="model_evaluation",
        display_name="Evaluate Model",
        code="./src/evaluation",
        command="python evaluate.py --model ${{inputs.model}} --test_data ${{inputs.data}}",
        inputs={
            "model": train_step.outputs.model,
            "data": prep_step.outputs.prepared_data
        },
        environment="azureml:evaluation-env:1"
    )

    return {"trained_model": train_step.outputs.model}
```

---

## 7. OSINT Data Collection Services

### 7.1 LinkedIn Data Collector Service
```python
import httpx
from typing import Optional, Dict
import asyncio
from tenacity import retry, stop_after_attempt, wait_exponential

class LinkedInEnrichmentService:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.linkedin.com/v2"
        self.rate_limiter = RateLimiter(calls=100, period=86400)

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10)
    )
    async def enrich_user_profile(self, email: str) -> Optional[Dict]:
        """Enrich user profile with LinkedIn data"""

        # Check consent
        if not await self.has_user_consent(email):
            return None

        async with self.rate_limiter:
            async with httpx.AsyncClient() as client:
                # Search for profile
                search_response = await client.get(
                    f"{self.base_url}/people",
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    params={"q": "email", "email": email}
                )

                if search_response.status_code != 200:
                    return None

                profile_data = search_response.json()

                # Extract relevant fields
                enriched_data = {
                    "professional_info": {
                        "current_position": profile_data.get("position"),
                        "company": profile_data.get("company"),
                        "industry": profile_data.get("industry"),
                        "years_experience": self.calculate_experience(profile_data)
                    },
                    "education": {
                        "highest_degree": profile_data.get("education", [{}])[0].get("degree"),
                        "institution": profile_data.get("education", [{}])[0].get("school")
                    },
                    "skills": profile_data.get("skills", [])[:10],  # Top 10 skills
                    "enrichment_timestamp": datetime.utcnow().isoformat()
                }

                # Store in compliant manner
                await self.store_enriched_data(email, enriched_data)

                return enriched_data
```

### 7.2 GitHub Activity Analyzer
```python
from github import Github
from github.GithubException import GithubException
import pandas as pd

class GitHubActivityAnalyzer:
    def __init__(self, access_token: str):
        self.github = Github(access_token)
        self.cache = {}

    async def analyze_developer_profile(self, username: str) -> Dict:
        """Analyze GitHub developer activity"""

        try:
            user = self.github.get_user(username)

            # Collect repository statistics
            repos = list(user.get_repos())

            repo_stats = {
                "total_repos": len(repos),
                "total_stars": sum(r.stargazers_count for r in repos),
                "total_forks": sum(r.forks_count for r in repos),
                "languages": self.get_language_distribution(repos),
                "topics": self.extract_topics(repos)
            }

            # Analyze contribution patterns
            contributions = {
                "commit_count_30d": self.get_recent_commits(user, days=30),
                "pr_count_30d": self.get_recent_pull_requests(user, days=30),
                "issue_count_30d": self.get_recent_issues(user, days=30),
                "contribution_streak": self.calculate_contribution_streak(user)
            }

            # Calculate developer score
            developer_score = self.calculate_developer_score(repo_stats, contributions)

            return {
                "username": username,
                "profile_url": user.html_url,
                "avatar_url": user.avatar_url,
                "bio": user.bio,
                "company": user.company,
                "location": user.location,
                "repository_stats": repo_stats,
                "contribution_stats": contributions,
                "developer_score": developer_score,
                "analyzed_at": datetime.utcnow().isoformat()
            }

        except GithubException as e:
            logger.error(f"Failed to analyze GitHub profile {username}: {e}")
            return None

    def calculate_developer_score(self, repos, contributions):
        """Calculate a developer activity score"""

        score = 0
        score += min(repos["total_repos"] * 2, 100)
        score += min(repos["total_stars"], 200)
        score += min(contributions["commit_count_30d"] * 3, 150)
        score += min(contributions["pr_count_30d"] * 5, 100)
        score += min(contributions["contribution_streak"], 50)

        return min(score / 6, 100)  # Normalize to 0-100
```

---

## 8. Privacy and Compliance Implementation

### 8.1 GDPR/CCPA Compliance Service
```python
from cryptography.fernet import Fernet
import hashlib

class PrivacyComplianceService:
    def __init__(self, encryption_key: bytes):
        self.fernet = Fernet(encryption_key)
        self.pii_fields = [
            'email', 'name', 'phone', 'address', 'ssn',
            'credit_card', 'ip_address', 'device_id'
        ]

    def encrypt_pii(self, data: Dict) -> Dict:
        """Encrypt PII fields in data"""

        encrypted_data = data.copy()

        for field in self.pii_fields:
            if field in encrypted_data:
                # Encrypt the value
                encrypted_value = self.fernet.encrypt(
                    str(encrypted_data[field]).encode()
                )
                encrypted_data[field] = encrypted_value.decode()

                # Store hash for searching
                encrypted_data[f"{field}_hash"] = hashlib.sha256(
                    str(data[field]).encode()
                ).hexdigest()

        return encrypted_data

    def pseudonymize_data(self, data: Dict, user_id: str) -> Dict:
        """Replace PII with pseudonyms"""

        pseudonymized = data.copy()
        pseudonym = hashlib.sha256(user_id.encode()).hexdigest()[:16]

        for field in self.pii_fields:
            if field in pseudonymized:
                if field == 'email':
                    pseudonymized[field] = f"user_{pseudonym}@masked.com"
                elif field == 'name':
                    pseudonymized[field] = f"User_{pseudonym}"
                elif field == 'phone':
                    pseudonymized[field] = "***-***-****"
                elif field == 'ip_address':
                    pseudonymized[field] = "***.***.***.***"
                else:
                    pseudonymized[field] = f"MASKED_{pseudonym}"

        return pseudonymized

    async def handle_deletion_request(self, user_id: str):
        """Handle GDPR/CCPA deletion request"""

        deletion_log = {
            "request_id": str(uuid.uuid4()),
            "user_id": user_id,
            "timestamp": datetime.utcnow().isoformat(),
            "status": "processing"
        }

        try:
            # Delete from all data stores
            await self.delete_from_cosmos(user_id)
            await self.delete_from_sql(user_id)
            await self.delete_from_data_lake(user_id)
            await self.anonymize_logs(user_id)
            await self.schedule_backup_deletion(user_id)

            deletion_log["status"] = "completed"
            deletion_log["completed_at"] = datetime.utcnow().isoformat()

            # Send confirmation
            await self.send_deletion_confirmation(user_id)

        except Exception as e:
            deletion_log["status"] = "failed"
            deletion_log["error"] = str(e)
            logger.error(f"Deletion request failed for {user_id}: {e}")

        # Store deletion log (immutable)
        await self.store_deletion_log(deletion_log)

        return deletion_log
```

---

## 9. Monitoring and Alerting

### 9.1 Application Insights Configuration
```python
from opencensus.ext.azure import metrics_exporter
from opencensus.stats import aggregation, measure, stats, view
from opencensus.tags import tag_key, tag_map, tag_value

class TelemetryMonitoring:
    def __init__(self, instrumentation_key: str):
        self.exporter = metrics_exporter.new_metrics_exporter(
            connection_string=f"InstrumentationKey={instrumentation_key}"
        )

        # Define custom metrics
        self.latency_measure = measure.MeasureFloat(
            "api_latency", "API call latency", "ms"
        )
        self.event_count_measure = measure.MeasureInt(
            "event_count", "Number of events", "1"
        )

        # Define views
        self.latency_view = view.View(
            "api_latency_distribution",
            "Distribution of API latencies",
            [],
            self.latency_measure,
            aggregation.DistributionAggregation([0, 10, 50, 100, 500, 1000])
        )

        self.event_view = view.View(
            "event_count_sum",
            "Total number of events",
            [],
            self.event_count_measure,
            aggregation.SumAggregation()
        )

        # Register views
        stats.stats.view_manager.register_view(self.latency_view)
        stats.stats.view_manager.register_view(self.event_view)

        # Register exporter
        stats.stats.view_manager.register_exporter(self.exporter)

    def track_metric(self, name: str, value: float, properties: Dict = None):
        """Track custom metric"""

        mmap = stats.stats.stats_recorder.new_measurement_map()

        if name == "api_latency":
            mmap.measure_float_put(self.latency_measure, value)
        elif name == "event_count":
            mmap.measure_int_put(self.event_count_measure, int(value))

        tmap = tag_map.TagMap()
        if properties:
            for key, val in properties.items():
                tmap.insert(tag_key.TagKey(key), tag_value.TagValue(str(val)))

        mmap.record(tmap)
```

### 9.2 Alert Rules Configuration
```json
{
    "alertRules": [
        {
            "name": "HighErrorRate",
            "description": "Alert when error rate exceeds 5%",
            "query": "requests | where timestamp > ago(5m) | summarize ErrorRate = countif(success == false) * 100.0 / count() | where ErrorRate > 5",
            "frequency": "PT5M",
            "severity": 2,
            "actions": ["email", "slack", "pagerduty"]
        },
        {
            "name": "HighLatency",
            "description": "Alert when P95 latency exceeds 1000ms",
            "query": "requests | where timestamp > ago(5m) | summarize P95 = percentile(duration, 95) | where P95 > 1000",
            "frequency": "PT5M",
            "severity": 3,
            "actions": ["email", "slack"]
        },
        {
            "name": "DataIngestionFailure",
            "description": "Alert when data ingestion fails",
            "query": "customEvents | where name == 'IngestionFailure' | where timestamp > ago(15m) | count",
            "frequency": "PT15M",
            "severity": 1,
            "actions": ["email", "slack", "pagerduty", "teams"]
        },
        {
            "name": "SecurityAnomaly",
            "description": "Alert on suspicious activity patterns",
            "query": "SecurityEvent | where TimeGenerated > ago(10m) | where AccountType == 'User' and EventID in (4624, 4625) | summarize FailedLogins = countif(EventID == 4625), SuccessfulLogins = countif(EventID == 4624) by Account | where FailedLogins > 5",
            "frequency": "PT10M",
            "severity": 1,
            "actions": ["email", "security_team", "siem"]
        }
    ]
}
```

---

## 10. Cost Optimization Automation

### 10.1 Auto-Scaling Configuration
```yaml
autoscaling:
  event_hubs:
    min_throughput_units: 2
    max_throughput_units: 20
    scale_up_threshold: 80  # CPU %
    scale_down_threshold: 30
    cooldown_period: 300  # seconds

  cosmos_db:
    min_ru: 400
    max_ru: 10000
    scale_up_threshold: 70  # RU utilization %
    scale_down_threshold: 30
    autoscale_enabled: true

  synapse_sql_pool:
    schedule:
      - action: "pause"
        time: "20:00"
        days: ["saturday", "sunday"]
      - action: "resume"
        time: "06:00"
        days: ["monday"]
      - action: "scale_down"
        target: "DW500c"
        time: "18:00"
        days: ["weekday"]
      - action: "scale_up"
        target: "DW1000c"
        time: "08:00"
        days: ["weekday"]

  storage_lifecycle:
    rules:
      - name: "MoveOldLogsToArchive"
        filters:
          prefix_match: ["logs/"]
          age_days: 30
        actions:
          - type: "tier_to_cool"
            after_days: 30
          - type: "tier_to_archive"
            after_days: 90
          - type: "delete"
            after_days: 365
```

### 10.2 Cost Monitoring Dashboard
```python
from azure.mgmt.costmanagement import CostManagementClient
from azure.mgmt.costmanagement.models import QueryDefinition, QueryTimePeriod

class CostMonitor:
    def __init__(self, subscription_id):
        self.cost_client = CostManagementClient(
            credential=DefaultAzureCredential(),
            subscription_id=subscription_id
        )

    def get_daily_costs(self, days=30):
        """Get daily cost breakdown"""

        query = QueryDefinition(
            type="ActualCost",
            timeframe="Custom",
            time_period=QueryTimePeriod(
                from_property=(datetime.now() - timedelta(days=days)).date(),
                to=(datetime.now()).date()
            ),
            dataset={
                "granularity": "Daily",
                "aggregation": {
                    "totalCost": {
                        "name": "PreTaxCost",
                        "function": "Sum"
                    }
                },
                "grouping": [
                    {
                        "type": "Dimension",
                        "name": "ServiceName"
                    }
                ]
            }
        )

        result = self.cost_client.query.usage(
            scope=f"/subscriptions/{self.subscription_id}",
            parameters=query
        )

        return self.format_cost_data(result)

    def identify_cost_anomalies(self):
        """Identify unusual cost spikes"""

        costs = self.get_daily_costs(30)
        df = pd.DataFrame(costs)

        # Calculate rolling average and standard deviation
        df['rolling_avg'] = df['cost'].rolling(window=7).mean()
        df['rolling_std'] = df['cost'].rolling(window=7).std()

        # Identify anomalies (costs > 2 std deviations from mean)
        df['is_anomaly'] = (df['cost'] > df['rolling_avg'] + 2 * df['rolling_std'])

        anomalies = df[df['is_anomaly']].to_dict('records')

        if anomalies:
            self.send_cost_alert(anomalies)

        return anomalies
```

---

## Conclusion

This implementation guide provides practical, production-ready code examples and configurations for deploying the AiDefRef data architecture on Azure. The configurations are optimized for:

1. **High Performance**: Utilizing Azure's native services for optimal throughput
2. **Cost Efficiency**: Auto-scaling and lifecycle management to minimize costs
3. **Security**: End-to-end encryption and comprehensive access controls
4. **Compliance**: GDPR/CCPA compliant data handling and retention
5. **Scalability**: Designed to handle growth from thousands to millions of users
6. **Monitoring**: Comprehensive observability and alerting

Regular review and optimization of these configurations will ensure the system continues to meet business needs while maintaining cost-effectiveness and compliance.