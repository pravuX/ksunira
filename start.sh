#!/bin/bash

LAN_IP=$(python3 -c 'import socket; s=socket.socket(socket.AF_INET, socket.SOCK_DGRAM); s.connect(("8.8.8.8", 80)); print(s.getsockname()[0]); s.close()' 2>/dev/null)

if [ -z "$LAN_IP" ]; then
    echo "Could not detect LAN IP automatically. Falling back to localhost."
    LAN_IP="localhost"
fi

echo " Starting K Sunira? on LAN IP: $LAN_IP"
echo "---------------------------------------------------"
echo " HOST: Open this link in your browser:"
echo "    http://$LAN_IP:3000"
echo ""
echo " GUESTS: Connect to the same Wi-Fi and scan the QR code"
echo "  on the Host's screen, or visit the link above!"
echo "---------------------------------------------------"

# Export for docker-compose
export LAN_IP=$LAN_IP

# Build and start services
# docker-compose up --build -d

# Start prebuilt services
docker-compose up -d

echo "Services started!"
echo "Logs:"
docker-compose logs -f
