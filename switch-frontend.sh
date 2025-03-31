#!/bin/bash

# Script to switch between React and React Native frontend in docker-compose.yml

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

COMPOSE_FILE="docker-compose.yml"
REACT_DIR="frontend"
REACT_NATIVE_DIR="frontend-react-native"

# Check if docker-compose.yml exists
if [ ! -f "$COMPOSE_FILE" ]; then
  echo -e "${RED}Error: $COMPOSE_FILE not found in current directory.${NC}"
  exit 1
fi

# Function to show usage
show_usage() {
  echo -e "Usage: $0 [react|react-native|status]"
  echo 
  echo -e "Commands:"
  echo -e "  ${GREEN}react${NC}        Switch to React web frontend"
  echo -e "  ${GREEN}react-native${NC} Switch to React Native frontend"
  echo -e "  ${GREEN}status${NC}       Show current frontend type"
  echo
}

# Function to check current frontend type
check_current_frontend() {
  if grep -q "context: ./frontend$" "$COMPOSE_FILE"; then
    echo -e "Current frontend: ${GREEN}React (Web)${NC}"
    return 0
  elif grep -q "context: ./frontend-react-native$" "$COMPOSE_FILE"; then
    echo -e "Current frontend: ${GREEN}React Native${NC}"
    return 1
  else
    echo -e "${YELLOW}Warning: Could not determine current frontend type.${NC}"
    return 2
  fi
}

# Switch to React frontend
switch_to_react() {
  echo -e "${YELLOW}Switching to React (Web) frontend...${NC}"
  # Replace using awk for more precision
  awk '{
    if ($0 ~ /context:.*frontend-react-native/) {
      gsub(/context:.*frontend-react-native/, "context: ./frontend")
    }
    print $0
  }' "$COMPOSE_FILE" > "$COMPOSE_FILE.tmp" && mv "$COMPOSE_FILE.tmp" "$COMPOSE_FILE"
  
  echo -e "${GREEN}Done! Frontend switched to React (Web).${NC}"
  echo -e "${YELLOW}Remember to rebuild and restart containers with:${NC}"
  echo -e "  ${GREEN}make build frontend${NC}"
  echo -e "  ${GREEN}make restart${NC}"
}

# Switch to React Native frontend
switch_to_react_native() {
  echo -e "${YELLOW}Switching to React Native frontend...${NC}"
  # Replace using awk for more precision
  awk '{
    if ($0 ~ /context:.*frontend$/) {
      gsub(/context:.*frontend$/, "context: ./frontend-react-native")
    }
    print $0
  }' "$COMPOSE_FILE" > "$COMPOSE_FILE.tmp" && mv "$COMPOSE_FILE.tmp" "$COMPOSE_FILE"
  
  echo -e "${GREEN}Done! Frontend switched to React Native.${NC}"
  echo -e "${YELLOW}Remember to rebuild and restart containers with:${NC}"
  echo -e "  ${GREEN}make build frontend${NC}"
  echo -e "  ${GREEN}make restart${NC}"
}

# Main script logic
case "$1" in
  react)
    check_current_frontend
    if [[ $? -eq 0 ]]; then
      echo -e "${YELLOW}Already using React (Web) frontend.${NC}"
    else
      switch_to_react
    fi
    ;;
  react-native)
    check_current_frontend
    if [[ $? -eq 1 ]]; then
      echo -e "${YELLOW}Already using React Native frontend.${NC}"
    else
      switch_to_react_native
    fi
    ;;
  status)
    check_current_frontend
    ;;
  *)
    show_usage
    ;;
esac

exit 0