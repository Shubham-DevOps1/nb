module.exports = {
  prefixes: ['NextGen', 'Enterprise', 'Autonomous', 'Apex', 'Helix', 'Quantum', 'Optima', 'Cognitive', 'Sentinel', 'Synapse'],
  suffixes: ['Platform', 'Engine', 'Integrator', 'Dashboard', 'Analyzer', 'Hub', 'Gateway', 'Optimizer', 'Console', 'System'],

  templates: {
    'Industrial IoT': {
      descriptions: [
        'Developing an edge telemetry hub that collects high-frequency sensor readings from industrial PLCs and transmits it to cloud services using MQTT and OPC UA.',
        'Building a modular industrial gateway for protocol translation (Modbus to MQTT) and local data buffering under disconnected network conditions.',
        'Creating an automated edge provisioning platform that securely configures, deploys, and updates firmware on thousands of industrial gateways.'
      ],
      technologies: ['C++', 'MQTT', 'Docker', 'AWS IoT Core', 'OPC UA', 'Bash', 'Linux Systems']
    },
    'Smart Factory': {
      descriptions: [
        'Developing a real-time digital twin of the assembly line, visualizing machine efficiency, cycle times, and operational equipment effectiveness (OEE).',
        'Implementing a smart conveyor routing controller that coordinates robotics, barcode readers, and sortation systems on the factory floor.',
        'Building a unified plant floor monitoring system that displays production metrics, safety alerts, and inventory statuses to operators via web dashboards.'
      ],
      technologies: ['Node.js', 'React', 'PostgreSQL', 'Kafka', 'Docker', 'Kubernetes', 'Redis']
    },
    'Predictive Maintenance': {
      descriptions: [
        'Building a machine learning pipeline that analyzes high-frequency vibration and acoustic data from turbines to predict mechanical wear and schedule proactive maintenance.',
        'Developing an anomaly detection system for industrial compressors, using thermal imaging data and neural networks to prevent catastrophic thermal failure.',
        'Creating a maintenance dispatch engine that automatically schedules technician service visits when wear indices exceed safe thresholds.'
      ],
      technologies: ['Python', 'TensorFlow', 'PyTorch', 'Pandas & NumPy', 'FastAPI', 'PostgreSQL', 'ChromaDB']
    },
    'HVAC Platform': {
      descriptions: [
        'Creating a centralized building climate control platform, implementing advanced setback algorithms and energy conservation strategies for commercial chillers.',
        'Building an API-driven integration hub that links building thermostats and air handlers with external utility pricing data for demand-response optimization.',
        'Developing a remote HVAC diagnostics dashboard that analyzes airflow and pressure drops to identify clogged filters and failing damper motors.'
      ],
      technologies: ['Node.js', 'TypeScript', 'Redis', 'PostgreSQL', 'React', 'Terraform', 'API Gateway']
    },
    'Smart Building': {
      descriptions: [
        'Integrating building automation networks (BACnet) with cloud systems to automate lighting, access control, and elevators based on real-time occupancy maps.',
        'Developing a smart parking optimization system that uses camera streams and ultrasonic sensors to guide drivers to empty spaces and automate billing.',
        'Building a secure building access control backend that utilizes encrypted badge reader APIs and logs audit trails on ledger databases.'
      ],
      technologies: ['Java', 'Spring Boot', 'MongoDB', 'React', 'MQTT', 'Docker', 'AWS']
    },
    'Healthcare Monitoring': {
      descriptions: [
        'Developing a HIPAA-compliant data ingestion pipeline that processes real-time vitals (ECG, SpO2) streaming from wearable medical sensors, triggering clinical alarms.',
        'Building an inpatient patient monitoring console that displays real-time bedside telemetry and trends it over time for physician review.',
        'Creating a machine learning model to detect atrial fibrillation from optical heart rate sensors, deployed as a secure serverless API.'
      ],
      technologies: ['Go', 'Node.js', 'Redis', 'AWS Lambda', 'DynamoDB', 'React', 'Playwright']
    },
    'Retail Analytics': {
      descriptions: [
        'Implementing an in-store computer vision and analytics engine that processes CCTV feeds to estimate customer dwell time and optimize store layouts.',
        'Developing a real-time inventory reconciliation and forecasting engine that automatically updates stock levels and triggers reorder requests.',
        'Building a dynamic pricing engine that adjusts online and brick-and-mortar retail prices based on demand, local stock levels, and competitor pricing.'
      ],
      technologies: ['Python', 'FastAPI', 'PostgreSQL', 'Next.js', 'Kafka', 'PyTorch', 'Cypress']
    },
    'Connected Appliances': {
      descriptions: [
        'Designing a secure MQTT API for smart ovens and refrigerators, enabling remote preheating schedules, diagnostic uploads, and temperature controls.',
        'Building a companion app backend for home appliance management, supporting user authentication, sharing access, and energy usage telemetry.',
        'Developing an OTA update orchestrator that signs, distributes, and verifies firmware binaries across multiple home appliance product versions.'
      ],
      technologies: ['Node.js', 'Go', 'Redis', 'AWS IoT Core', 'React Native', 'ESP32', 'C']
    },
    'Smart Irrigation': {
      descriptions: [
        'Creating an automated agricultural irrigation controller that monitors soil moisture levels and local evapotranspiration forecasts to schedule watering.',
        'Developing a flow monitoring and leak detection system for large-scale farm pipelines, triggering automated valve shutdowns on pressure anomalies.',
        'Building a GIS-mapped dashboard for growers, detailing current soil moisture, water consumption metrics, and pump status across multiple fields.'
      ],
      technologies: ['C', 'C++', 'ESP32', 'MQTT', 'Python', 'PostgreSQL', 'Vue']
    },
    'Energy Management': {
      descriptions: [
        'Building a demand-response management platform that coordinates solar inverters, battery storage arrays, and load shedding switches to stabilize local grids.',
        'Developing a predictive forecasting tool for solar farm power generation, using meteorological data feeds and historical output analytics.',
        'Creating an enterprise utility billing engine that processes raw smart meter data to calculate dynamic time-of-use charges.'
      ],
      technologies: ['Python', 'Go', 'Cassandra', 'Kafka', 'React', 'GCP', 'Terraform']
    }
  }
};
